// WattWise Notification System
// Priority: 1) CallMeBot (free, instant, background) → 2) Twilio → 3) wa.me link
//
// CallMeBot: Free WhatsApp notification API. User saves +34 644 26 33 77 on WhatsApp,
// sends "I allow callmebot to send me messages", gets an APIKEY. Done.
// Twilio Trial in 2026 requires ContentSid templates which Trial can't create (error 21654),
// so CallMeBot is the reliable free alternative.

const https = require("https");
const http = require("http");

let twilioClient = null;

// =====================================================
// TWILIO INIT (kept as secondary option)
// =====================================================
const initTwilioClient = () => {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
  } = process.env;

  try {
    const twilio = require("twilio");

    const apiKey = (TWILIO_API_KEY || "").trim();
    const apiSecret = (TWILIO_API_SECRET || "").trim();
    const accountSid = (TWILIO_ACCOUNT_SID || "").trim();
    const authToken = (TWILIO_AUTH_TOKEN || "").trim();

    if (apiKey.startsWith("SK") && apiSecret && !apiSecret.includes("paste") && accountSid.startsWith("AC")) {
      twilioClient = twilio(apiKey, apiSecret, { accountSid });
      console.log("[notify] Twilio client initialized with API Key SID:", apiKey.slice(0, 8) + "...");
      return;
    }

    const isPlaceholderToken =
      !authToken ||
      authToken.includes("paste_your_auth_token") ||
      authToken.length < 10;

    if (accountSid.startsWith("AC") && !isPlaceholderToken) {
      twilioClient = twilio(accountSid, authToken);
      console.log("[notify] Twilio client initialized with Account SID:", accountSid.slice(0, 8) + "...");
      return;
    }

    twilioClient = null;
  } catch (e) {
    console.error("[notify] Twilio init error:", e.message);
    twilioClient = null;
  }
};

initTwilioClient();

// =====================================================
// HELPERS
// =====================================================
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
};

const getWhatsAppLink = (mobile, message) => {
  const targetNumber = normalizePhoneNumber(mobile);
  if (!targetNumber) return null;
  const digitsOnly = targetNumber.replace(/\+/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
};

// =====================================================
// CALLMEBOT - FREE WHATSAPP API (PRIMARY)
// =====================================================
// Sends a WhatsApp message instantly in the background via CallMeBot.
// Setup: User saves +34 644 26 33 77, sends "I allow callmebot to send me messages",
// gets APIKEY. Store in .env as CALLMEBOT_APIKEY and CALLMEBOT_PHONE.
const sendViaCallMeBot = (phone, message) => {
  return new Promise((resolve) => {
    const apiKey = (process.env.CALLMEBOT_APIKEY || "").trim();
    const targetPhone = normalizePhoneNumber(phone || process.env.CALLMEBOT_PHONE);

    if (!apiKey || !targetPhone) {
      return resolve({
        sent: false,
        reason: "CallMeBot not configured. Add CALLMEBOT_APIKEY and CALLMEBOT_PHONE to backend/.env",
      });
    }

    const digitsOnly = targetPhone.replace(/\+/g, "");
    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${digitsOnly}&text=${encodedMsg}&apikey=${apiKey}`;

    console.log(`[CallMeBot] Sending to ${digitsOnly}...`);

    https.get(url, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => {
        console.log(`[CallMeBot] Response (${res.statusCode}): ${body.trim().slice(0, 200)}`);
        if (res.statusCode === 200 && !body.toLowerCase().includes("error")) {
          resolve({
            sent: true,
            gateway: "CallMeBot",
            sid: "CALLMEBOT-" + Date.now(),
          });
        } else {
          resolve({
            sent: false,
            reason: `CallMeBot returned: ${body.trim().slice(0, 200)}`,
            gateway: "CallMeBot",
          });
        }
      });
    }).on("error", (err) => {
      console.error("[CallMeBot] Network error:", err.message);
      resolve({ sent: false, reason: "CallMeBot network error: " + err.message });
    });
  });
};

// =====================================================
// TWILIO WHATSAPP (SECONDARY - often blocked on Trial)
// =====================================================
const sendViaTwilio = async (mobile, message) => {
  const targetNumber = normalizePhoneNumber(mobile);
  if (!targetNumber) {
    return { sent: false, reason: "No valid mobile number provided." };
  }

  const rawSender = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
  const fromWhatsApp = rawSender.startsWith("whatsapp:")
    ? rawSender
    : `whatsapp:${rawSender}`;
  const toWhatsApp = `whatsapp:${targetNumber}`;

  if (!twilioClient) {
    return { sent: false, reason: "Twilio client not initialized." };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: fromWhatsApp,
      to: toWhatsApp,
    });

    console.log(`[Twilio] Dispatched to ${toWhatsApp}, sid=${result.sid}`);
    return { sent: true, sid: result.sid, gateway: "Twilio" };
  } catch (error) {
    console.error("[Twilio] WhatsApp error:", error.code, error.message);
    return { sent: false, reason: error.message, code: error.code, gateway: "Twilio" };
  }
};

// =====================================================
// MAIN: sendWhatsAppAlert (tries CallMeBot → Twilio → fail with wa.me link)
// =====================================================
const sendWhatsAppAlert = async (mobile, message) => {
  const targetNumber = normalizePhoneNumber(mobile);
  if (!targetNumber) {
    return { sent: false, reason: "No valid mobile number provided." };
  }

  // 1) Try CallMeBot first (free, works on trial, instant background delivery)
  const callmebotKey = (process.env.CALLMEBOT_APIKEY || "").trim();
  if (callmebotKey) {
    const cmResult = await sendViaCallMeBot(mobile, message);
    if (cmResult.sent) {
      return cmResult;
    }
    console.warn("[notify] CallMeBot failed, trying Twilio fallback...", cmResult.reason);
  }

  // 2) Try Twilio (may fail on trial with 21654)
  if (twilioClient) {
    const tResult = await sendViaTwilio(mobile, message);
    if (tResult.sent) {
      return tResult;
    }
    console.warn("[notify] Twilio also failed:", tResult.reason);

    // Return a helpful message
    let userReason = tResult.reason;
    if (tResult.code === 21654) {
      userReason = "Twilio Trial accounts in 2026 require Content Templates for WhatsApp, but Trial accounts cannot create templates. Please configure CallMeBot (free) in Settings for instant WhatsApp alerts.";
    }
    return {
      sent: false,
      reason: callmebotKey
        ? userReason
        : "No alert gateway configured. Go to Settings and configure CallMeBot for free instant WhatsApp alerts.",
      code: tResult.code,
    };
  }

  // 3) Nothing configured
  return {
    sent: false,
    reason: "No alert gateway configured. Go to Settings → WhatsApp Gateway and add your CallMeBot API Key for free instant alerts.",
  };
};

// =====================================================
// SMS
// =====================================================
const sendSmsAlert = async (mobile, message) => {
  const targetNumber = normalizePhoneNumber(mobile);
  if (!targetNumber) {
    return { sent: false, reason: "No valid mobile number provided." };
  }
  const twilioPhone = (process.env.TWILIO_PHONE_NUMBER || "").trim();
  if (!twilioClient || !twilioPhone) {
    return {
      sent: false,
      reason: "Twilio SMS is not configured. Set TWILIO_PHONE_NUMBER and valid Twilio credentials.",
    };
  }
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhone,
      to: targetNumber,
    });
    return { sent: true, sid: result.sid, gateway: "Twilio" };
  } catch (error) {
    console.error("[Twilio] SMS error:", error.code, error.message);
    return {
      sent: false,
      reason: error.message,
      code: error.code,
      gateway: "Twilio",
    };
  }
};

module.exports = {
  sendSmsAlert,
  sendWhatsAppAlert,
  sendViaCallMeBot,
  normalizePhoneNumber,
  getWhatsAppLink,
  initTwilioClient,
};
