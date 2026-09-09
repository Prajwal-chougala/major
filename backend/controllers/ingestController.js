const Reading = require("../models/Reading");
const { createReadingAlerts } = require("../services/alertService");

// Hardware (ESP32/Arduino) posts sensor readings here, authenticated via
// its own apiKey rather than a user JWT (see middleware/apiKeyMiddleware).
// Body: { voltage, current, power, timestamp? }
const ingestReading = async (req, res) => {
  try {
    const device = req.device; // set by apiKeyMiddleware
    let { voltage, current, power, energy, frequency, powerFactor, timestamp } = req.body;

    // Support flexible hardware payloads:
    // If power is provided without voltage/current, infer them.
    if (power !== undefined && Number.isFinite(Number(power))) {
      power = Number(power);
      voltage = voltage !== undefined && Number.isFinite(Number(voltage)) ? Number(voltage) : 230;
      current = current !== undefined && Number.isFinite(Number(current)) ? Number(current) : Number((power / (voltage || 230)).toFixed(3));
    } else if (
      voltage !== undefined &&
      current !== undefined &&
      Number.isFinite(Number(voltage)) &&
      Number.isFinite(Number(current))
    ) {
      voltage = Number(voltage);
      current = Number(current);
      power = Number((voltage * current).toFixed(2));
    } else {
      return res.status(400).json({
        message: "Valid power reading (or voltage and current) is required.",
      });
    }

    const now = timestamp ? new Date(timestamp) : new Date();
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
      });
    }

    // Determine local date string in IST (UTC+5:30) for daily energy resets
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const currentDateStr = istNow.toISOString().split("T")[0];

    // Find the previous reading to calculate incremental electric energy (kWh)
    const previousReading = await Reading.findOne({ deviceId: device.deviceId })
      .sort({ timestamp: -1 })
      .lean();

    const pzemEnergyKWh = energy !== undefined && Number.isFinite(Number(energy)) ? Number(energy) : 0;

    const reading = await Reading.create({
      deviceId: device.deviceId,
      voltage,
      current,
      power,
      energy: pzemEnergyKWh,
      frequency: frequency !== undefined && Number.isFinite(Number(frequency)) ? Number(frequency) : null,
      powerFactor: powerFactor !== undefined && Number.isFinite(Number(powerFactor)) ? Number(powerFactor) : null,
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
      dailyEnergyKWh: device.dailyEnergyKWh || 0,
      autoOffDueToLimit: !!device.autoOffDueToLimit,
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
