const Reading = require("../models/Reading");
const { createReadingAlerts } = require("../services/alertService");

// Hardware (ESP32/Arduino) posts sensor readings here, authenticated via
// its own apiKey rather than a user JWT (see middleware/apiKeyMiddleware).
// Body: { voltage, current, power, timestamp? }
const ingestReading = async (req, res) => {
  try {
    const device = req.device; // set by apiKeyMiddleware
    const { voltage, current, power, timestamp } = req.body;

    if (
      voltage === undefined ||
      current === undefined ||
      power === undefined
    ) {
      return res.status(400).json({
        message: "voltage, current and power are required.",
      });
    }

    if (
      !Number.isFinite(Number(voltage)) ||
      !Number.isFinite(Number(current)) ||
      !Number.isFinite(Number(power))
    ) {
      return res.status(400).json({
        message: "voltage, current and power must be valid numbers.",
      });
    }

    device.lastSeen = new Date();
    device.status = "online";

    if (device.powerState === "OFF") {
      // Device was told to turn off (manually or via auto-off) - keep the
      // connectivity ping but don't log a reading or re-trigger alerts.
      await device.save();

      return res.status(200).json({
        message: "Device is OFF, reading ignored.",
        powerState: "OFF",
      });
    }

    const reading = await Reading.create({
      deviceId: device.deviceId,
      voltage: Number(voltage),
      current: Number(current),
      power: Number(power),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    await device.save();

    await createReadingAlerts({ reading, device });

    return res.status(201).json({
      message: "Reading stored successfully.",
      powerState: device.powerState,
      reading,
    });
  } catch (error) {
    console.error("Ingest reading error:", error);

    return res.status(500).json({
      message: "Unable to store reading.",
    });
  }
};

// Hardware polls this to find out if it should currently be ON or OFF -
// this is how a remote "Turn off" tap or an auto-off timeout actually
// reaches a relay wired to the appliance.
const getIngestStatus = async (req, res) => {
  try {
    const device = req.device; // set by apiKeyMiddleware

    return res.status(200).json({
      powerState: device.powerState,
      powerLimit: device.powerLimit,
    });
  } catch (error) {
    console.error("Get ingest status error:", error);

    return res.status(500).json({
      message: "Unable to fetch device status.",
    });
  }
};

module.exports = {
  ingestReading,
  getIngestStatus,
};
