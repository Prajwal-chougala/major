const Device = require("../models/Device");
const Reading = require("../models/Reading");

const RATE_PER_KWH =
  Number(process.env.RATE_PER_KWH) || 8;

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get only this user's devices
    const devices = await Device.find({
      owner: userId,
    }).lean();

    if (devices.length === 0) {
      return res.status(200).json({
        totalEnergyKWh: 0,
        currentPowerKW: 0,
        activeDevices: 0,
        totalDevices: 0,
        offlineDevices: 0,
        estimatedCost: 0,
        peakPowerKW: 0,
        devices: [],
      });
    }

    const deviceIds = devices.map(
      (device) => device.deviceId
    );

    // Start of today in IST (UTC+5:30)
    const now = new Date();

    const istNow = new Date(
      now.getTime() + 5.5 * 60 * 60 * 1000
    );

    istNow.setUTCHours(0, 0, 0, 0);

    const startOfDay = new Date(
      istNow.getTime() -
        5.5 * 60 * 60 * 1000
    );

    // Get today's readings for user's devices
    const readings = await Reading.find({
      deviceId: {
        $in: deviceIds,
      },
      timestamp: {
        $gte: startOfDay,
      },
    })
      .sort({ timestamp: 1 })
      .lean();

    // Group readings by device
    const readingsByDevice = {};

    for (const reading of readings) {
      if (!readingsByDevice[reading.deviceId]) {
        readingsByDevice[reading.deviceId] = [];
      }

      readingsByDevice[reading.deviceId].push(
        reading
      );
    }

    let totalEnergyKWh = 0;
    let peakPowerW = 0;
    let currentPowerW = 0;

    const deviceSummaries = [];

    for (const device of devices) {
      const deviceReadings =
        readingsByDevice[device.deviceId] || [];

      // Calculate peak power
      for (const reading of deviceReadings) {
        const power = Number(reading.power) || 0;

        if (power > peakPowerW) {
          peakPowerW = power;
        }
      }

      // Latest reading for this device
      const latestReading =
        deviceReadings.length > 0
          ? deviceReadings[
              deviceReadings.length - 1
            ]
          : null;

      if (latestReading) {
        currentPowerW +=
          Number(latestReading.power) || 0;
      }

      // Energy calculation
      let deviceEnergyKWh = 0;

      for (
        let i = 1;
        i < deviceReadings.length;
        i++
      ) {
        const previous =
          deviceReadings[i - 1];

        const current =
          deviceReadings[i];

        const previousTime =
          new Date(
            previous.timestamp
          ).getTime();

        const currentTime =
          new Date(
            current.timestamp
          ).getTime();

        const hours =
          (currentTime - previousTime) /
          (1000 * 60 * 60);

        if (hours <= 0) {
          continue;
        }

        const averagePowerW =
          (Number(previous.power) +
            Number(current.power)) /
          2;

        deviceEnergyKWh +=
          (averagePowerW * hours) / 1000;
      }

      totalEnergyKWh += deviceEnergyKWh;

      deviceSummaries.push({
        deviceId: device.deviceId,
        name: device.name,
        location: device.location || "",
        status: device.status,
        currentPowerW: latestReading
          ? Number(latestReading.power)
          : 0,
        energyKWh: Number(
          deviceEnergyKWh.toFixed(4)
        ),
        lastSeen: device.lastSeen,
      });
    }

    const activeDevices = devices.filter(
      (device) => device.status === "online"
    ).length;

    const offlineDevices =
      devices.length - activeDevices;

    const estimatedCost =
      totalEnergyKWh * RATE_PER_KWH;

    return res.status(200).json({
      totalEnergyKWh: Number(
        totalEnergyKWh.toFixed(4)
      ),

      currentPowerKW: Number(
        (currentPowerW / 1000).toFixed(3)
      ),

      activeDevices,

      totalDevices: devices.length,

      offlineDevices,

      estimatedCost: Number(
        estimatedCost.toFixed(2)
      ),

      ratePerKWh: RATE_PER_KWH,

      peakPowerKW: Number(
        (peakPowerW / 1000).toFixed(3)
      ),

      devices: deviceSummaries,
    });
  } catch (error) {
    console.error(
      "Dashboard data error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load dashboard data.",
    });
  }
};

module.exports = {
  getDashboard,
};