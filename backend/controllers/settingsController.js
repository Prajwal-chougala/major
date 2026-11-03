const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const {
  getSmsConfiguration,
  sendSmsAlert,
} = require("../utils/notify");

const envPath = path.join(__dirname, "../.env");
const SMS_API_KEY_ENV = "FAST2SMS_API_KEY";

const persistEnvKey = (key, value) => {
  try {
    if (!fs.existsSync(envPath)) return false;

    let content = fs.readFileSync(envPath, "utf8");
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${JSON.stringify(value)}`);
    } else {
      content = `${content.trimEnd()}\n${key}=${JSON.stringify(value)}\n`;
    }

    fs.writeFileSync(envPath, content, "utf8");
    return true;
  } catch (error) {
    console.error(`Unable to persist ${key} to the backend environment file:`, error);
    return false;
  }
};

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
        mobile: user.mobile || "",
        role: user.role,
      },
      sms: {
        ...getSmsConfiguration(),
        hasApiKey: Boolean((process.env[SMS_API_KEY_ENV] || "").trim()),
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ message: "Unable to retrieve settings." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { mobile, name } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (mobile !== undefined) user.mobile = mobile.trim();
    if (name !== undefined) user.name = name.trim();

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
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
        message: "Only an administrator can configure the Fast2SMS API key.",
      });
    }

    const apiKey =
      typeof req.body.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(apiKey)) {
      return res.status(400).json({
        message: "Enter a valid Fast2SMS API key.",
      });
    }

    process.env[SMS_API_KEY_ENV] = apiKey;
    const persisted = persistEnvKey(SMS_API_KEY_ENV, apiKey);

    return res.status(200).json({
      message: persisted
        ? "Fast2SMS API key saved. Send a test SMS to verify it."
        : "Fast2SMS API key set for this server process. Add FAST2SMS_API_KEY to your hosting environment to keep it after restart.",
      sms: {
        ...getSmsConfiguration(),
        hasApiKey: true,
      },
      persisted,
    });
  } catch (error) {
    console.error("Update SMS configuration error:", error);
    return res.status(500).json({ message: "Unable to update SMS configuration." });
  }
};

const sendTestSms = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const result = await sendSmsAlert(
      user.mobile,
      "WattWise test SMS: Fast2SMS alert settings are working."
    );

    if (!result.sent) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Fast2SMS accepted the test SMS for ${user.mobile}. Check the phone for delivery.`,
      targetPhone: user.mobile,
      sid: result.sid,
      status: result.status,
    });
  } catch (error) {
    console.error("Test SMS error:", error);
    return res.status(500).json({ message: "Unable to send test SMS." });
  }
};

module.exports = {
  getSettings,
  updateProfile,
  updateSmsConfig,
  sendTestSms,
};
