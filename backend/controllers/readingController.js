const Reading = require("../models/Reading");
const Device = require("../models/Device");
const { createReadingAlerts } = require("../services/alertService");

// Add a new energy reading
const createReading = async (req, res) => {
  try {
    const {
      deviceId,
      voltage,
      current,
      power,
      timestamp,
    } = req.body;

    // Validate required fields
    if (
      !deviceId ||
      voltage === undefined ||
      current === undefined ||
      power === undefined
    ) {
      return res.status(400).json({
        message:
          "deviceId, voltage, current and power are required.",
      });
    }

    // Validate numeric values
    if (
      !Number.isFinite(Number(voltage)) ||
      !Number.isFinite(Number(current)) ||
      !Number.isFinite(Number(power))
    ) {
      return res.status(400).json({
        message:
          "Voltage, current and power must be valid numbers.",
      });
    }

    // Make sure the device exists
    const device = await Device.findOne({
      deviceId: deviceId.trim(),
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    // For now, only the device owner can submit readings
    if (
      req.user.userId !== device.owner.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to submit readings for this device.",
      });
    }

    // Determine local date string in IST (UTC+5:30) for daily resets
    const now = timestamp ? new Date(timestamp) : new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const currentDateStr = istNow.toISOString().split("T")[0];

    // Find the previous reading to calculate energy
    const previousReading = await Reading.findOne({ deviceId: device.deviceId })
      .sort({ timestamp: -1 })
      .lean();

    const reading = await Reading.create({
      deviceId: deviceId.trim(),
      voltage: Number(voltage),
      current: Number(current),
      power: Number(power),
      timestamp: now,
    });

    let energyKWh = 0;
    if (previousReading) {
      const previousTime = new Date(previousReading.timestamp).getTime();
      const currentTime = now.getTime();
      const hours = (currentTime - previousTime) / (1000 * 60 * 60);
      
      if (hours > 0 && hours < 24) { // Ignore huge jumps
        const averagePowerW = (Number(previousReading.power) + Number(power)) / 2;
        energyKWh = (averagePowerW * hours) / 1000;
      }
    }

    // Reset daily energy if it's a new day
    if (device.dailyEnergyDate !== currentDateStr) {
      device.dailyEnergyKWh = 0;
      device.dailyEnergyDate = currentDateStr;
      device.autoOffDueToLimit = false; // Reset the limit flag on a new day
    }

    device.dailyEnergyKWh += energyKWh;
    device.lastSeen = now;
    device.status = "online";

    await device.save();

    // Evaluate the new reading for threshold/limit alerts (SMS + auto-off
    // if the device has a configured powerLimit). Errors here are logged
    // internally and never fail the reading write itself.
    await createReadingAlerts({ reading, device });

    return res.status(201).json({
      message: "Reading stored successfully.",
      reading,
    });
  } catch (error) {
    console.error("Create reading error:", error);

    return res.status(500).json({
      message: "Unable to store reading.",
    });
  }
};


// Get readings for a device
const getDeviceReadings = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // First verify ownership
    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    const readings = await Reading.find({
      deviceId,
    })
      .sort({ timestamp: -1 })
      .limit(500);

    return res.status(200).json({
      deviceId,
      count: readings.length,
      readings,
    });
  } catch (error) {
    console.error("Get readings error:", error);

    return res.status(500).json({
      message: "Unable to fetch readings.",
    });
  }
};


module.exports = {
  createReading,
  getDeviceReadings,
};