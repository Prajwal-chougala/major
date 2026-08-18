const Device = require("../models/Device");
const { clearAutoOffTimer } = require("../services/alertService");

// Create a new device
const createDevice = async (req, res) => {
  try {
    const { deviceId, name, location, powerLimit, autoOffMinutes } = req.body;

    if (!deviceId || !name) {
      return res.status(400).json({
        message: "Device ID and device name are required.",
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
      powerLimit: powerLimit !== undefined ? Number(powerLimit) : null,
      autoOffMinutes:
        autoOffMinutes !== undefined ? Number(autoOffMinutes) : null,
    });

    return res.status(201).json({
      message: "Device created successfully.",
      device,
    });
  } catch (error) {
    console.error("Create device error:", error);

    return res.status(500).json({
      message: "Unable to create device.",
    });
  }
};


// Get all devices belonging to logged-in user
const getDevices = async (req, res) => {
  try {
    const devices = await Device.find({
      owner: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      count: devices.length,
      devices,
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

    return res.status(200).json({
      device,
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
    const { name, location, powerLimit, autoOffMinutes } = req.body;

    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    if (name !== undefined) {
      device.name = name.trim();
    }

    if (location !== undefined) {
      device.location = location.trim();
    }

    if (powerLimit !== undefined) {
      device.powerLimit = powerLimit === null ? null : Number(powerLimit);
    }

    if (autoOffMinutes !== undefined) {
      device.autoOffMinutes =
        autoOffMinutes === null ? null : Number(autoOffMinutes);
    }

    await device.save();

    return res.status(200).json({
      message: "Device updated successfully.",
      device,
    });
  } catch (error) {
    console.error("Update device error:", error);

    return res.status(500).json({
      message: "Unable to update device.",
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

// Regenerate a device's hardware API key (e.g. if it leaked). The old key
// stops working immediately - update your ESP32/Arduino firmware after this.
const regenerateApiKey = async (req, res) => {
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

    device.apiKey = require("crypto").randomBytes(24).toString("hex");

    await device.save();

    return res.status(200).json({
      message: "API key regenerated successfully.",
      apiKey: device.apiKey,
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
};