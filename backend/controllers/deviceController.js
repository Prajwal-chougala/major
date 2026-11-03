const Device = require("../models/Device");
const Reading = require("../models/Reading");
const { clearAutoOffTimer } = require("../services/alertService");
const { normalizePhoneNumber, sendSmsAlert } = require("../utils/notify");
const { getRatePerKWh } = require("../utils/tariff");
const { regenerateDeviceApiKey } = require("../services/deviceKeyService");

const serializeDevice = (device) => {
  const result = device.toObject ? device.toObject() : { ...device };
  delete result.wifiPassword;
  return result;
};

const parseOptionalNumber = (value, { minimum = 0, integer = false } = {}) => {
  if (value === undefined) return { valid: true, value: undefined };
  if (value === null || value === "") return { valid: true, value: null };

  const number = Number(value);
  return {
    valid:
      Number.isFinite(number) &&
      number >= minimum &&
      (!integer || Number.isInteger(number)),
    value: number,
  };
};

const normalizeAlertPhone = (phone) => {
  if (phone === undefined || phone === null || phone === "") {
    return { valid: true, value: "" };
  }
  const normalized = normalizePhoneNumber(phone);
  return { valid: Boolean(normalized), value: normalized };
};

// Helper to calculate today's IST start
const getStartOfTodayIST = () => {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - 5.5 * 60 * 60 * 1000);
};

// Create a new device
const createDevice = async (req, res) => {
  try {
    const {
      deviceId,
      name,
      location,
      powerLimit,
      powerThresholdW,
      autoOffMinutes,
      alertPhone,
    } = req.body;

    if (!deviceId || !name) {
      return res.status(400).json({
        message: "Device ID and device name are required.",
      });
    }

    const energyLimit = parseOptionalNumber(powerLimit);
    const wattLimit = parseOptionalNumber(powerThresholdW);
    const autoOff = parseOptionalNumber(autoOffMinutes, {
      minimum: 1,
      integer: true,
    });
    const smsPhone = normalizeAlertPhone(alertPhone);
    const invalidWattLimit =
      wattLimit.value !== undefined &&
      wattLimit.value !== null &&
      wattLimit.value <= 0;
    if (
      !energyLimit.valid ||
      !wattLimit.valid ||
      invalidWattLimit ||
      !autoOff.valid ||
      !smsPhone.valid
    ) {
      return res.status(400).json({
        message:
          "Daily energy threshold must be non-negative, watt threshold must be positive, auto-off minutes must be a positive whole number, and SMS numbers must be valid Indian mobiles.",
      });
    }

    const existingDevice = await Device.findOne({
      deviceId: deviceId.trim(),
    });

    if (existingDevice) {
      return res.status(409).json({
        message: "A device with this device ID already exists.",
      });
    }

    const device = await Device.create({
      deviceId: deviceId.trim(),
      name: name.trim(),
      location: location?.trim() || "",
      owner: req.user.userId,
      status: "offline",
      powerLimit: energyLimit.value ?? null,
      powerThresholdW: wattLimit.value ?? null,
      autoOffMinutes: autoOff.value ?? null,
      alertPhone: smsPhone.value,
    });

    return res.status(201).json({
      message: "Device created successfully.",
      device: serializeDevice(device),
    });
  } catch (error) {
    console.error("Create device error:", error);

    return res.status(500).json({
      message: "Unable to create device.",
    });
  }
};


// Get all devices belonging to logged-in user enriched with real-time telemetry
const getDevices = async (req, res) => {
  try {
    const devices = await Device.find({
      owner: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    if (devices.length === 0) {
      return res.status(200).json({
        count: 0,
        devices: [],
      });
    }

    const deviceIds = devices.map((d) => d.deviceId);
    const startOfDay = getStartOfTodayIST();
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Fetch today's readings for these devices
    const todayReadings = await Reading.find({
      deviceId: { $in: deviceIds },
      timestamp: { $gte: startOfDay },
    })
      .sort({ timestamp: 1 })
      .lean();

    const readingsByDevice = {};
    for (const r of todayReadings) {
      if (!readingsByDevice[r.deviceId]) readingsByDevice[r.deviceId] = [];
      readingsByDevice[r.deviceId].push(r);
    }

    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
        const deviceReadings = readingsByDevice[device.deviceId] || [];

        let latestReading =
          deviceReadings.length > 0
            ? deviceReadings[deviceReadings.length - 1]
            : null;

        if (!latestReading) {
          latestReading = await Reading.findOne({ deviceId: device.deviceId })
            .sort({ timestamp: -1 })
            .lean();
        }

        // Energy trapezoidal calculation
        let deviceEnergyKWh = 0;
        for (let i = 1; i < deviceReadings.length; i++) {
          const previous = deviceReadings[i - 1];
          const current = deviceReadings[i];
          const previousTime = new Date(previous.timestamp).getTime();
          const currentTime = new Date(current.timestamp).getTime();
          const hours = (currentTime - previousTime) / (1000 * 60 * 60);
          if (hours > 0) {
            const avgPower = (Number(previous.power) + Number(current.power)) / 2;
            deviceEnergyKWh += (avgPower * hours) / 1000;
          }
        }

        const activeEnergyKWh = Math.max(Number(device.dailyEnergyKWh || 0), deviceEnergyKWh);
        const isOnline = !!(device.lastSeen && new Date(device.lastSeen) >= twoMinutesAgo);

        const devObj = device.toObject ? device.toObject() : device;
        return {
          ...devObj,
          wifiPassword: undefined,
          ratePerKWh: getRatePerKWh(),
          isOnline,
          status: isOnline ? "online" : "offline",
          currentPowerW: latestReading && device.powerState === "ON" ? Number(latestReading.power) : 0,
          energyKWh: Number(activeEnergyKWh.toFixed(4)),
          dailyEnergyKWh: Number(activeEnergyKWh.toFixed(4)),
          voltage: latestReading ? Number(latestReading.voltage || 0) : 0,
          current: latestReading && device.powerState === "ON" ? Number(latestReading.current || 0) : 0,
          frequency: latestReading && latestReading.frequency ? Number(latestReading.frequency) : (latestReading ? 50.0 : 0),
          powerFactor: latestReading && latestReading.powerFactor ? Number(latestReading.powerFactor) : (latestReading ? 1.0 : 0),
        };
      })
    );

    return res.status(200).json({
      count: enrichedDevices.length,
      devices: enrichedDevices,
    });
  } catch (error) {
    console.error("Get devices error:", error);

    return res.status(500).json({
      message: "Unable to fetch devices.",
    });
  }
};


// Get one device belonging to logged-in user
const getDeviceById = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    const startOfDay = getStartOfTodayIST();
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const deviceReadings = await Reading.find({
      deviceId,
      timestamp: { $gte: startOfDay },
    })
      .sort({ timestamp: 1 })
      .lean();

    let latestReading =
      deviceReadings.length > 0
        ? deviceReadings[deviceReadings.length - 1]
        : null;

    if (!latestReading) {
      latestReading = await Reading.findOne({ deviceId })
        .sort({ timestamp: -1 })
        .lean();
    }

    let deviceEnergyKWh = 0;
    for (let i = 1; i < deviceReadings.length; i++) {
      const previous = deviceReadings[i - 1];
      const current = deviceReadings[i];
      const previousTime = new Date(previous.timestamp).getTime();
      const currentTime = new Date(current.timestamp).getTime();
      const hours = (currentTime - previousTime) / (1000 * 60 * 60);
      if (hours > 0) {
        const avgPower = (Number(previous.power) + Number(current.power)) / 2;
        deviceEnergyKWh += (avgPower * hours) / 1000;
      }
    }

    const activeEnergyKWh = Math.max(Number(device.dailyEnergyKWh || 0), deviceEnergyKWh);
    const isOnline = !!(device.lastSeen && new Date(device.lastSeen) >= twoMinutesAgo);

    const devObj = device.toObject ? device.toObject() : device;
    const enrichedDevice = {
      ...devObj,
      wifiPassword: undefined,
      ratePerKWh: getRatePerKWh(),
      isOnline,
      status: isOnline ? "online" : "offline",
      currentPowerW: latestReading && device.powerState === "ON" ? Number(latestReading.power) : 0,
      energyKWh: Number(activeEnergyKWh.toFixed(4)),
      dailyEnergyKWh: Number(activeEnergyKWh.toFixed(4)),
      voltage: latestReading ? Number(latestReading.voltage || 0) : 0,
      current: latestReading && device.powerState === "ON" ? Number(latestReading.current || 0) : 0,
      frequency: latestReading && latestReading.frequency ? Number(latestReading.frequency) : (latestReading ? 50.0 : 0),
      powerFactor: latestReading && latestReading.powerFactor ? Number(latestReading.powerFactor) : (latestReading ? 1.0 : 0),
    };

    return res.status(200).json({
      device: enrichedDevice,
    });
  } catch (error) {
    console.error("Get device error:", error);

    return res.status(500).json({
      message: "Unable to fetch device.",
    });
  }
};


// Update a device belonging to logged-in user
const updateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const {
      name,
      location,
      powerLimit,
      powerThresholdW,
      autoOffMinutes,
      alertPhone,
    } = req.body;

    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    const energyLimit = parseOptionalNumber(powerLimit);
    const wattLimit = parseOptionalNumber(powerThresholdW);
    const autoOff = parseOptionalNumber(autoOffMinutes, {
      minimum: 1,
      integer: true,
    });
    const smsPhone = normalizeAlertPhone(alertPhone);
    const invalidWattLimit =
      wattLimit.value !== undefined &&
      wattLimit.value !== null &&
      wattLimit.value <= 0;
    if (
      !energyLimit.valid ||
      !wattLimit.valid ||
      invalidWattLimit ||
      !autoOff.valid ||
      !smsPhone.valid
    ) {
      return res.status(400).json({
        message:
          "Daily energy threshold must be non-negative, watt threshold must be positive, auto-off minutes must be a positive whole number, and SMS numbers must be valid Indian mobiles.",
      });
    }

    if (name !== undefined) {
      device.name = name.trim();
    }

    if (location !== undefined) {
      device.location = location.trim();
    }

    if (energyLimit.value !== undefined) {
      device.powerLimit = energyLimit.value;
      clearAutoOffTimer(device._id);
      clearAutoOffTimer(device.deviceId);
      if (device.powerLimit && device.dailyEnergyKWh < device.powerLimit) {
        device.autoOffDueToLimit = false;
      }
    }

    if (wattLimit.value !== undefined) {
      device.powerThresholdW = wattLimit.value;
      device.powerAlertActive = false;
      clearAutoOffTimer(device._id);
      clearAutoOffTimer(device.deviceId);
    }

    if (autoOff.value !== undefined) {
      device.autoOffMinutes = autoOff.value;
      clearAutoOffTimer(device._id);
      clearAutoOffTimer(device.deviceId);
    }

    if (smsPhone.value !== undefined) {
      device.alertPhone = smsPhone.value;
    }

    await device.save();

    return res.status(200).json({
      message: "Device updated successfully.",
      device: serializeDevice(device),
    });
  } catch (error) {
    console.error("Update device error:", error);

    return res.status(500).json({
      message: "Unable to update device.",
    });
  }
};

const updateDeviceWifi = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { wifiSSID, wifiPassword } = req.body;
    if (wifiSSID === undefined && wifiPassword === undefined) {
      return res.status(400).json({
        message: "Provide a Wi-Fi network name or password to update.",
      });
    }
    if (
      wifiSSID !== undefined &&
      (typeof wifiSSID !== "string" || !wifiSSID.trim())
    ) {
      return res.status(400).json({
        message: "Wi-Fi network name cannot be empty.",
      });
    }
    if (wifiPassword !== undefined && typeof wifiPassword !== "string") {
      return res.status(400).json({
        message: "Wi-Fi password must be a string.",
      });
    }

    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    }).select("+wifiPassword");

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    if (wifiSSID !== undefined) device.wifiSSID = wifiSSID.trim();
    if (wifiPassword !== undefined) device.wifiPassword = wifiPassword;
    await device.save();

    return res.status(200).json({
      message: `Wi-Fi settings updated for "${device.name}". The device will sync them on its next check-in.`,
      device: {
        deviceId: device.deviceId,
        wifiSSID: device.wifiSSID,
        wifiConfigured: Boolean(device.wifiSSID),
      },
    });
  } catch (error) {
    console.error("Update device Wi-Fi error:", error);
    return res.status(500).json({
      message: "Unable to update device Wi-Fi settings.",
    });
  }
};


// Delete a device belonging to logged-in user
const deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOneAndDelete({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    clearAutoOffTimer(device._id);

    return res.status(200).json({
      message: "Device deleted successfully.",
    });
  } catch (error) {
    console.error("Delete device error:", error);

    return res.status(500).json({
      message: "Unable to delete device.",
    });
  }
};


// Manually turn a device OFF - also cancels any pending auto-off timer
// (e.g. from an over-limit reading) since the user has already acted.
const turnOffDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    device.powerState = "OFF";
    device.powerAlertActive = false;

    await device.save();

    clearAutoOffTimer(device._id);

    return res.status(200).json({
      message: `${device.name} turned OFF successfully.`,
      device,
    });
  } catch (error) {
    console.error("Turn off device error:", error);

    return res.status(500).json({
      message: "Unable to turn off device.",
    });
  }
};

// Manually turn a device back ON.
const turnOnDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    device.powerState = "ON";
    device.autoOffDueToLimit = false;
    device.powerAlertActive = false;
    clearAutoOffTimer(device._id);
    clearAutoOffTimer(device.deviceId);

    await device.save();

    return res.status(200).json({
      message: `${device.name} turned ON successfully.`,
      device,
    });
  } catch (error) {
    console.error("Turn on device error:", error);

    return res.status(500).json({
      message: "Unable to turn on device.",
    });
  }
};

const testDeviceSms = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    const User = require("../models/User");
    const user = await User.findById(req.user.userId);
    const targetPhone =
      device.alertPhone || (user ? user.mobile || user.mobileNumber : null);
    if (!targetPhone) {
      return res.status(400).json({
        message:
          "Add an alert number to this device or a mobile number to your profile first.",
      });
    }

    const result = await sendSmsAlert(
      targetPhone,
      `WattWise test SMS for "${device.name}". Fast2SMS accepted test messages do not guarantee phone delivery.`
    );
    if (!result.sent) {
      return res.status(502).json({
        success: false,
        message: result.reason,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Fast2SMS accepted a test SMS for ${targetPhone}. Provider acceptance does not guarantee phone delivery.`,
      targetPhone,
      status: result.status,
    });
  } catch (error) {
    console.error("Test device SMS error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send test SMS.",
    });
  }
};

// Regenerate a device's hardware API key (e.g. if it leaked). The old key
// stops working immediately - update your ESP32/Arduino firmware after this.
const regenerateApiKey = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const apiKey = await regenerateDeviceApiKey(deviceId, req.user.userId);
    if (!apiKey) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    return res.status(200).json({
      message: "API key regenerated successfully.",
      apiKey,
    });
  } catch (error) {
    console.error("Regenerate API key error:", error);

    return res.status(500).json({
      message: "Unable to regenerate API key.",
    });
  }
};


module.exports = {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  turnOnDevice,
  turnOffDevice,
  regenerateApiKey,
  testDeviceSms,
  updateDeviceWifi,
};