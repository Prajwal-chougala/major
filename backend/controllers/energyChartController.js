const Device = require("../models/Device");
const Reading = require("../models/Reading");

const getEnergyChart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const period = req.query.period || "today";

    const devices = await Device.find({
      owner: userId,
    }).lean();

    const deviceIds = devices.map(
      (device) => device.deviceId
    );

    if (deviceIds.length === 0) {
      return res.status(200).json({
        period,
        totalEnergyKWh: 0,
        data: [],
      });
    }

    const now = new Date();

    let startDate;

    if (period === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(
        startDate.getDate() - 6
      );
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      startDate = new Date(now);
      startDate.setDate(
        startDate.getDate() - 29
      );
      startDate.setHours(0, 0, 0, 0);
    } else {
      return res.status(400).json({
        message: "Invalid period.",
      });
    }

    const readings = await Reading.find({
      deviceId: {
        $in: deviceIds,
      },
      timestamp: {
        $gte: startDate,
      },
    })
      .sort({ timestamp: 1 })
      .lean();

    if (readings.length < 2) {
      return res.status(200).json({
        period,
        totalEnergyKWh: 0,
        data: [],
        message:
          "Not enough readings for chart.",
      });
    }

    /*
      Calculate energy between consecutive
      readings using the trapezoidal method.
    */

    const buckets = {};

    let totalEnergyKWh = 0;

    for (let i = 1; i < readings.length; i++) {
      const previous = readings[i - 1];
      const current = readings[i];

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

      const energyKWh =
        (averagePowerW * hours) / 1000;

      totalEnergyKWh += energyKWh;

      const date =
        new Date(current.timestamp);

      let label;

      if (period === "today") {
        label = date.toLocaleTimeString(
          "en-IN",
          {
            hour: "numeric",
            hour12: true,
          }
        );
      } else if (period === "week") {
        label = date.toLocaleDateString(
          "en-IN",
          {
            weekday: "short",
          }
        );
      } else {
        label = date.toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
          }
        );
      }

      if (!buckets[label]) {
        buckets[label] = 0;
      }

      buckets[label] += energyKWh;
    }

    const data = Object.entries(buckets).map(
      ([label, energy]) => ({
        label,
        energy: Number(
          energy.toFixed(4)
        ),
      })
    );

    return res.status(200).json({
      period,
      totalEnergyKWh: Number(
        totalEnergyKWh.toFixed(4)
      ),
      data,
    });
  } catch (error) {
    console.error(
      "Energy chart error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load energy chart.",
    });
  }
};

module.exports = {
  getEnergyChart,
};