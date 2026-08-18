const Device = require("../models/Device");
const Reading = require("../models/Reading");

const getPowerChart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const devices = await Device.find({
      owner: userId,
    })
      .select("deviceId")
      .lean();

    const deviceIds = devices.map(
      (device) => device.deviceId
    );

    if (deviceIds.length === 0) {
      return res.status(200).json({
        currentPowerKW: 0,
        peakPowerKW: 0,
        averagePowerKW: 0,
        data: [],
      });
    }

    const readings = await Reading.find({
      deviceId: {
        $in: deviceIds,
      },
    })
      .sort({
        timestamp: -1,
      })
      .limit(50)
      .lean();

    const powerValues = readings.map(
      (reading) =>
        Number(reading.power) || 0
    );

    const currentPowerW =
      powerValues.length > 0
        ? powerValues[0]
        : 0;

    const peakPowerW =
      powerValues.length > 0
        ? Math.max(...powerValues)
        : 0;

    const averagePowerW =
      powerValues.length > 0
        ? powerValues.reduce(
            (sum, power) =>
              sum + power,
            0
          ) / powerValues.length
        : 0;

    const data = readings
      .slice()
      .reverse()
      .map((reading) => {
        const date = new Date(
          reading.timestamp
        );

        return {
          time: date.toLocaleTimeString(
            "en-IN",
            {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }
          ),

          power: Number(
            (
              (Number(reading.power) ||
                0) / 1000
            ).toFixed(3)
          ),
        };
      });

    return res.status(200).json({
      currentPowerKW: Number(
        (currentPowerW / 1000).toFixed(3)
      ),

      peakPowerKW: Number(
        (peakPowerW / 1000).toFixed(3)
      ),

      averagePowerKW: Number(
        (averagePowerW / 1000).toFixed(3)
      ),

      data,
    });
  } catch (error) {
    console.error(
      "Power chart error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load power chart.",
    });
  }
};

module.exports = {
  getPowerChart,
};