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

    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

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
      let latestReading =
        deviceReadings.length > 0
          ? deviceReadings[
              deviceReadings.length - 1
            ]
          : null;

      if (!latestReading) {
        latestReading = await Reading.findOne({ deviceId: device.deviceId })
          .sort({ timestamp: -1 })
          .lean();
      }

      if (latestReading && device.powerState === "ON") {
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

      const activeEnergyKWh = Math.max(Number(device.dailyEnergyKWh || 0), deviceEnergyKWh);
      totalEnergyKWh += activeEnergyKWh;

      deviceSummaries.push({
        deviceId: device.deviceId,
        name: device.name,
        location: device.location || "",
        status: device.status,
        isOnline: !!(device.lastSeen && new Date(device.lastSeen) >= twoMinutesAgo),
        powerState: device.powerState || "OFF",
        powerLimit: device.powerLimit !== undefined && device.powerLimit !== null ? device.powerLimit : null,
        currentPowerW: latestReading && device.powerState === "ON"
          ? Number(latestReading.power)
          : 0,
        energyKWh: Number(
          activeEnergyKWh.toFixed(4)
        ),
        dailyEnergyKWh: Number(
          activeEnergyKWh.toFixed(4)
        ),
        voltage: latestReading ? Number(latestReading.voltage || 0) : 0,
        current: latestReading && device.powerState === "ON" ? Number(latestReading.current || 0) : 0,
        frequency: latestReading && latestReading.frequency ? Number(latestReading.frequency) : (latestReading ? 50.0 : 0),
        powerFactor: latestReading && latestReading.powerFactor ? Number(latestReading.powerFactor) : (latestReading ? 1.0 : 0),
        lastSeen: device.lastSeen,
        rawReading: latestReading,
      });
    }

    // Active = user has powered the device ON via the app
    const activeDevices = devices.filter(
      (device) => device.powerState === "ON"
    ).length;

    // Hardware online = device sent a reading within the last 2 minutes
    const hardwareOnline = devices.filter(
      (device) => device.lastSeen && new Date(device.lastSeen) >= twoMinutesAgo
    ).length;

    const offlineDevices = devices.length - activeDevices;

    const estimatedCost =
      totalEnergyKWh * RATE_PER_KWH;

    // Find the latest reading across all devices for live telemetry cards
    let latestSystemReading = null;
    for (const dev of deviceSummaries) {
      if (dev.rawReading) {
        if (!latestSystemReading || new Date(dev.rawReading.timestamp) > new Date(latestSystemReading.timestamp)) {
          latestSystemReading = dev.rawReading;
        }
      }
    }

    // Clean up internal rawReading property before sending
    deviceSummaries.forEach(d => { delete d.rawReading; });

    return res.status(200).json({
      totalEnergyKWh: Number(
        totalEnergyKWh.toFixed(4)
      ),

      currentPowerKW: Number(
        (currentPowerW / 1000).toFixed(3)
      ),

      currentPowerW: Number(currentPowerW.toFixed(1)),

      activeDevices,

      hardwareOnline,

      totalDevices: devices.length,

      offlineDevices,

      estimatedCost: Number(
        estimatedCost.toFixed(2)
      ),

      ratePerKWh: RATE_PER_KWH,

      peakPowerKW: Number(
        (peakPowerW / 1000).toFixed(3)
      ),

      latestVoltage: latestSystemReading ? Number(latestSystemReading.voltage || 0) : 0,
      latestFrequency: latestSystemReading && latestSystemReading.frequency ? Number(latestSystemReading.frequency) : (latestSystemReading ? 50.0 : 0),
      latestCurrent: latestSystemReading ? Number(latestSystemReading.current || 0) : 0,
      latestPowerFactor: latestSystemReading && latestSystemReading.powerFactor ? Number(latestSystemReading.powerFactor) : (latestSystemReading ? 1.0 : 0),

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