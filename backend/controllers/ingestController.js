const Reading = require("../models/Reading");
const { createReadingAlerts } = require("../services/alertService");

// Hardware (ESP32/Arduino) posts sensor readings here, authenticated via
// its own apiKey rather than a user JWT (see middleware/apiKeyMiddleware).
// Body: { voltage, current, power, timestamp? }
const ingestReading = async (req, res) => {
  try {
    const device = req.device; // set by apiKeyMiddleware
    let { voltage, current, power, energy, frequency, powerFactor, timestamp } = req.body;

    const parseNumber = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };

    if (
      power !== undefined &&
      (parseNumber(power) === null || parseNumber(power) < 0)
    ) {
      return res.status(400).json({
        message: "Power must be a valid non-negative number.",
      });
    }

    // Keep power-only payload compatibility while rejecting malformed sensor fields.
    if (power !== undefined) {
      power = Number(power);
      const parsedVoltage = parseNumber(voltage);
      const parsedCurrent = parseNumber(current);
      if (
        (voltage !== undefined &&
          (parsedVoltage === null || parsedVoltage <= 0)) ||
        (current !== undefined && (parsedCurrent === null || parsedCurrent < 0))
      ) {
        return res.status(400).json({
          message: "Voltage must be positive and current must be non-negative.",
        });
      }

      voltage = parsedVoltage ?? 230;
      current =
        parsedCurrent ??
        Number((power / (voltage || 230)).toFixed(3));
    } else if (
      voltage !== undefined &&
      current !== undefined &&
      parseNumber(voltage) !== null &&
      parseNumber(current) !== null
    ) {
      voltage = Number(voltage);
      current = Number(current);
      if (voltage <= 0 || current < 0) {
        return res.status(400).json({
          message: "Voltage must be positive and current must be non-negative.",
        });
      }
      power = Number((voltage * current).toFixed(2));
    } else {
      return res.status(400).json({
        message: "Valid power reading (or voltage and current) is required.",
      });
    }

    const parsedEnergy = parseNumber(energy);
    const parsedFrequency = parseNumber(frequency);
    const parsedPowerFactor = parseNumber(powerFactor);
    if (
      (energy !== undefined && (parsedEnergy === null || parsedEnergy < 0)) ||
      (frequency !== undefined &&
        (parsedFrequency === null || parsedFrequency <= 0)) ||
      (powerFactor !== undefined &&
        (parsedPowerFactor === null ||
          parsedPowerFactor < 0 ||
          parsedPowerFactor > 1))
    ) {
      return res.status(400).json({
        message:
          "Energy must be non-negative, frequency must be positive, and power factor must be between 0 and 1.",
      });
    }

    const now = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(now.getTime())) {
      return res.status(400).json({ message: "Timestamp must be a valid date." });
    }
    device.lastSeen = now;
    device.status = "online";

    if (device.powerState === "OFF") {
      // Device was told to turn off (manually or via auto-off) - keep the
      // connectivity ping but don't log a reading or re-trigger alerts.
      await device.save();

      return res.status(200).json({
        message: "Device is OFF, reading ignored.",
        powerState: "OFF",
        dailyEnergyKWh: device.dailyEnergyKWh || 0,
        autoOffDueToLimit: !!device.autoOffDueToLimit,
        wifiSSID: device.wifiSSID || "",
        wifiPassword: device.wifiPassword || "",
      });
    }

    // Determine local date string in IST (UTC+5:30) for daily energy resets
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const currentDateStr = istNow.toISOString().split("T")[0];

    // Find the previous reading to calculate incremental electric energy (kWh)
    const previousReading = await Reading.findOne({ deviceId: device.deviceId })
      .sort({ timestamp: -1 })
      .lean();

    const pzemEnergyKWh = parsedEnergy ?? 0;

    const reading = await Reading.create({
      deviceId: device.deviceId,
      voltage,
      current,
      power,
      energy: pzemEnergyKWh,
      frequency: parsedFrequency,
      powerFactor: parsedPowerFactor,
      timestamp: now,
    });

    let deltaEnergyKWh = 0;
    if (previousReading) {
      const previousTime = new Date(previousReading.timestamp).getTime();
      const currentTime = now.getTime();
      const hours = (currentTime - previousTime) / (1000 * 60 * 60);

      if (hours > 0 && hours < 24) {
        // Trapezoidal integration: average power (W) * hours / 1000 = kWh
        const averagePowerW = (Number(previousReading.power) + power) / 2;
        deltaEnergyKWh = (averagePowerW * hours) / 1000;
      }
    }

    // Reset daily energy if it's a new day
    if (device.dailyEnergyDate !== currentDateStr) {
      device.dailyEnergyKWh = 0;
      device.dailyEnergyDate = currentDateStr;
      device.autoOffDueToLimit = false;
    }

    // Combine continuous trapezoidal integration with PZEM hardware counter
    const currentAccumulated = Number(((device.dailyEnergyKWh || 0) + deltaEnergyKWh).toFixed(4));
    device.dailyEnergyKWh = Number(Math.max(currentAccumulated, pzemEnergyKWh).toFixed(4));

    await device.save();

    // Evaluate energy threshold: will automatically turn device OFF and send SMS if limit exceeded
    await createReadingAlerts({ reading, device });

    return res.status(201).json({
      message: "Reading stored successfully.",
      powerState: device.powerState,
      dailyEnergyKWh: device.dailyEnergyKWh,
      autoOffDueToLimit: !!device.autoOffDueToLimit,
      wifiSSID: device.wifiSSID || "",
      wifiPassword: device.wifiPassword || "",
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

    // Update lastSeen & status so hardware polling keeps the device online
    device.lastSeen = new Date();
    device.status = "online";
    await device.save();

    return res.status(200).json({
      powerState: device.powerState,
      powerLimit: device.powerLimit,
      dailyEnergyKWh: device.dailyEnergyKWh || 0,
      autoOffDueToLimit: !!device.autoOffDueToLimit,
      wifiSSID: device.wifiSSID || "",
      wifiPassword: device.wifiPassword || "",
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
