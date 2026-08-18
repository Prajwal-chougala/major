const Alert = require("../models/Alert");

const getAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const alerts = await Alert.find({
      owner: userId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(50)
      .lean();

    return res.status(200).json({
      alerts,
    });
  } catch (error) {
    console.error(
      "Get alerts error:",
      error
    );

    return res.status(500).json({
      message: "Unable to load alerts.",
    });
  }
};

const getRecentAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const alerts = await Alert.find({
      owner: userId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .lean();

    return res.status(200).json({
      alerts,
    });
  } catch (error) {
    console.error(
      "Get recent alerts error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load recent alerts.",
    });
  }
};

const markAlertAsRead = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const alert = await Alert.findOneAndUpdate(
      {
        _id: id,
        owner: userId,
      },
      {
        $set: {
          isRead: true,
        },
      },
      {
        new: true,
      }
    );

    if (!alert) {
      return res.status(404).json({
        message: "Alert not found.",
      });
    }

    return res.status(200).json({
      message: "Alert marked as read.",
      alert,
    });
  } catch (error) {
    console.error(
      "Mark alert read error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update alert.",
    });
  }
};

module.exports = {
  getAlerts,
  getRecentAlerts,
  markAlertAsRead,
};