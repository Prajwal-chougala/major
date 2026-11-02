const User = require("../models/User");
const { initTwilioClient, sendWhatsAppAlert, sendViaCallMeBot } = require("../utils/notify");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");

// Helper: persist a key=value into .env file
const persistEnvKey = (key, value) => {
  try {
    if (!fs.existsSync(envPath)) return;
    let content = fs.readFileSync(envPath, "utf8");
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`;
    }
    fs.writeFileSync(envPath, content, "utf8");
  } catch (e) {
    console.warn(`Could not persist ${key} to .env:`, e.message);
  }
};

// Get current user profile & notification settings
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const callmebotConfigured = Boolean((process.env.CALLMEBOT_APIKEY || "").trim());

    const hasValidTwilio =
      Boolean(process.env.TWILIO_ACCOUNT_SID) &&
      ((Boolean(process.env.TWILIO_API_KEY) && Boolean(process.env.TWILIO_API_SECRET)) ||
       (Boolean(process.env.TWILIO_AUTH_TOKEN) &&
        !process.env.TWILIO_AUTH_TOKEN.includes("paste_your_auth_token") &&
        process.env.TWILIO_AUTH_TOKEN.trim().length >= 10));

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || "",
      },
      callmebot: {
        phone: process.env.CALLMEBOT_PHONE || "",
        hasApiKey: callmebotConfigured,
        isConfigured: callmebotConfigured,
      },
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || "",
        hasAuthToken: hasValidTwilio,
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886",
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
        isConfigured: hasValidTwilio,
        smsConfigured: hasValidTwilio && Boolean(process.env.TWILIO_PHONE_NUMBER?.trim()),
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ message: "Unable to retrieve settings." });
  }
};

// Update user mobile number
const updateProfile = async (req, res) => {
  try {
    const { mobile, name } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (mobile !== undefined) {
      user.mobile = mobile.trim();
    }
    if (name !== undefined) {
      user.name = name.trim();
    }

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

// Update CallMeBot settings (PRIMARY alert gateway)
const updateCallMeBotConfig = async (req, res) => {
  try {
    const { phone, apiKey } = req.body;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ message: "CallMeBot API Key is required." });
    }

    const targetPhone = phone ? phone.trim() : "";
    const cleanKey = apiKey.trim();

    process.env.CALLMEBOT_APIKEY = cleanKey;
    if (targetPhone) process.env.CALLMEBOT_PHONE = targetPhone;

    persistEnvKey("CALLMEBOT_APIKEY", cleanKey);
    if (targetPhone) persistEnvKey("CALLMEBOT_PHONE", targetPhone);

    // Quick test to verify it works
    const testResult = await sendViaCallMeBot(
      targetPhone,
      "✅ WattWise: CallMeBot gateway connected successfully!"
    );

    return res.status(200).json({
      message: testResult.sent
        ? "CallMeBot configured & test message sent! Check your WhatsApp."
        : `CallMeBot saved but test delivery issue: ${testResult.reason}`,
      isConfigured: true,
      testSent: testResult.sent,
    });
  } catch (error) {
    console.error("Update CallMeBot config error:", error);
    return res.status(500).json({ message: "Unable to update CallMeBot configuration." });
  }
};

// Update Twilio Gateway settings dynamically and persist to .env
const updateTwilioConfig = async (req, res) => {
  try {
    const { accountSid, authToken, whatsappNumber, phoneNumber } = req.body;

    if (accountSid && accountSid.trim().startsWith("SK")) {
      return res.status(400).json({
        message: "The SID you entered starts with 'SK', which is an API Key SID, not your main Account SID. Your Account SID starts with 'AC'.",
      });
    }

    if (accountSid) { process.env.TWILIO_ACCOUNT_SID = accountSid.trim(); persistEnvKey("TWILIO_ACCOUNT_SID", accountSid.trim()); }
    if (authToken && !authToken.includes("•")) { process.env.TWILIO_AUTH_TOKEN = authToken.trim(); persistEnvKey("TWILIO_AUTH_TOKEN", authToken.trim()); }
    if (whatsappNumber) { process.env.TWILIO_WHATSAPP_NUMBER = whatsappNumber.trim(); persistEnvKey("TWILIO_WHATSAPP_NUMBER", whatsappNumber.trim()); }
    if (phoneNumber) { process.env.TWILIO_PHONE_NUMBER = phoneNumber.trim(); persistEnvKey("TWILIO_PHONE_NUMBER", phoneNumber.trim()); }

    initTwilioClient();

    const isConfigured =
      Boolean(process.env.TWILIO_ACCOUNT_SID) &&
      Boolean(process.env.TWILIO_AUTH_TOKEN) &&
      !process.env.TWILIO_AUTH_TOKEN.includes("paste_your_auth_token") &&
      process.env.TWILIO_AUTH_TOKEN.trim().length >= 10;
    const smsConfigured =
      isConfigured && Boolean(process.env.TWILIO_PHONE_NUMBER?.trim());

    return res.status(200).json({
      message: isConfigured
        ? "Twilio credentials updated and initialized!"
        : "Twilio credentials saved.",
      isConfigured,
      smsConfigured,
    });
  } catch (error) {
    console.error("Update Twilio config error:", error);
    return res.status(500).json({ message: "Unable to update Twilio configuration." });
  }
};

module.exports = {
  getSettings,
  updateProfile,
  updateCallMeBotConfig,
  updateTwilioConfig,
};
