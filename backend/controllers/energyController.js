const Reading = require("../models/Reading");
const Device = require("../models/Device");
const { calculateTariff } = require("../utils/tariff");

// Calculate energy and cost for a device
const getDeviceEnergy = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Make sure the logged-in user owns this device
    const device = await Device.findOne({
      deviceId,
      owner: req.user.userId,
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    // Start of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Get today's readings in chronological order
    const readings = await Reading.find({
      deviceId,
      timestamp: {
        $gte: startOfDay,
      },
    })
      .sort({ timestamp: 1 })
      .lean();

    if (readings.length < 2) {
      const tariff = calculateTariff(0);
      return res.status(200).json({
        deviceId,
        date: startOfDay.toISOString().split("T")[0],
        totalEnergyKWh: 0,
        totalUnits: 0,
        estimatedCost: 0,
        ratePerKWh: tariff.ratePerKWh,
        ratePerUnit: tariff.ratePerUnit,
        projectedMonthlyCost: 0,
        currency: tariff.currency,
        currencyCode: tariff.currencyCode,
        readingCount: readings.length,
        message:
          "Not enough readings to calculate energy.",
      });
    }

    let totalEnergyKWh = 0;

    for (let i = 1; i < readings.length; i++) {
      const previous = readings[i - 1];
      const current = readings[i];

      const previousTime = new Date(
        previous.timestamp
      ).getTime();

      const currentTime = new Date(
        current.timestamp
      ).getTime();

      const hours =
        (currentTime - previousTime) /
        (1000 * 60 * 60);

      // Ignore invalid or negative time intervals
      if (hours <= 0) {
        continue;
      }

      // Average power between two readings
      const averagePowerW =
        (Number(previous.power) +
          Number(current.power)) /
        2;

      // W × hours / 1000 = kWh
      const energyKWh =
        (averagePowerW * hours) / 1000;

      totalEnergyKWh += energyKWh;
    }

    totalEnergyKWh = Number(
      totalEnergyKWh.toFixed(4)
    );

    const tariff = calculateTariff(totalEnergyKWh);

    return res.status(200).json({
      deviceId,
      date: startOfDay
        .toISOString()
        .split("T")[0],
      totalEnergyKWh,
      totalUnits: totalEnergyKWh,
      estimatedCost: tariff.dailyCost,
      projectedMonthlyCost: tariff.projectedMonthlyCost,
      ratePerKWh: tariff.ratePerKWh,
      ratePerUnit: tariff.ratePerUnit,
      currency: tariff.currency,
      currencyCode: tariff.currencyCode,
      readingCount: readings.length,
    });
  } catch (error) {
    console.error(
      "Get device energy error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to calculate device energy.",
    });
  }
};

module.exports = {
  getDeviceEnergy,
};