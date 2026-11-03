const User = require("../models/User");
const {
  getSmsConfiguration,
  normalizePhoneNumber,
  sendSmsAlert,
} = require("../utils/notify");

const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || user.mobileNumber || "",
        role: user.role,
      },
      sms: getSmsConfiguration(),
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ message: "Unable to retrieve settings." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { name, mobile } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          message: "Name must contain at least 2 characters.",
        });
      }
      user.name = name.trim();
    }

    if (mobile !== undefined) {
      if (typeof mobile !== "string") {
        return res.status(400).json({
          message: "Mobile number must be a string.",
        });
      }
      const normalizedMobile = mobile.trim()
        ? normalizePhoneNumber(mobile)
        : "";
      if (mobile.trim() && !normalizedMobile) {
        return res.status(400).json({
          message:
            "Enter a valid Indian mobile number in 10-digit or +91 format.",
        });
      }
      user.mobile = normalizedMobile;
      user.mobileNumber = normalizedMobile;
    }

    await user.save();
    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || "",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Unable to update profile." });
  }
};

const updateSmsConfig = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Only an administrator can configure Fast2SMS.",
      });
    }

    const apiKey =
      typeof req.body.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (!apiKey || apiKey.length > 512 || /[\r\n]/.test(apiKey)) {
      return res.status(400).json({
        message: "Enter a valid Fast2SMS API key.",
      });
    }

    process.env.FAST2SMS_API_KEY = apiKey;
    return res.status(200).json({
      message:
        "Fast2SMS is configured for this server process. Set FAST2SMS_API_KEY in the hosting environment to retain it after a restart.",
      sms: getSmsConfiguration(),
    });
  } catch (error) {
    console.error("Update SMS configuration error:", error);
    return res.status(500).json({
      message: "Unable to update SMS configuration.",
    });
  }
};

const sendTestSms = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const mobile = user.mobile || user.mobileNumber;
    if (!normalizePhoneNumber(mobile)) {
      return res.status(400).json({
        success: false,
        message:
          "Save a valid Indian mobile number to your profile before sending a test SMS.",
      });
    }

    const result = await sendSmsAlert(
      mobile,
      "WattWise test SMS: Fast2SMS accepted this test request. Provider acceptance does not guarantee phone delivery."
    );
    if (!result.sent) {
      return res.status(502).json({
        success: false,
        message: result.reason,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Fast2SMS accepted a test SMS for ${normalizePhoneNumber(
        mobile
      )}. Provider acceptance does not guarantee phone delivery.`,
      status: result.status,
    });
  } catch (error) {
    console.error("Test SMS error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send test SMS.",
    });
  }
};

module.exports = {
  getSettings,
  updateProfile,
  updateSmsConfig,
  sendTestSms,
};
