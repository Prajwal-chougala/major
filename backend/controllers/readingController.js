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

    const reading = await Reading.create({
      deviceId: deviceId.trim(),
      voltage: Number(voltage),
      current: Number(current),
      power: Number(power),
      timestamp: timestamp
        ? new Date(timestamp)
        : new Date(),
    });

    // Update device's last activity
    device.lastSeen = new Date();
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