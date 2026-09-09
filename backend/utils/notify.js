// Handles outbound SMS and WhatsApp alerts via Twilio.
// If Twilio credentials aren't configured yet, falls back to logging so the
// rest of the app keeps working during local development.

let twilioClient = null;

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TWILIO_WHATSAPP_NUMBER,
} = process.env;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  const twilio = require("twilio");
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn(
    "[notify] Twilio credentials not set (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN). " +
      "SMS & WhatsApp alerts will be logged to the console instead of actually sent."
  );
}

// Normalizes a phone number to standard E.164 format (+[country code][number])
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    // If a 10-digit number is provided, assume India (+91) as default, or prepend +
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
};

// Send an SMS alert to a user's mobile number (expects E.164 format, e.g. +15551234567).
const sendSmsAlert = async (mobile, message) => {
  const targetNumber = normalizePhoneNumber(mobile);
  if (!targetNumber) {
    console.warn("[notify] No mobile number on file, skipping SMS:", message);
    return { sent: false, reason: "no_mobile_number" };
  }

  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.log(`[SMS MOCK] To ${targetNumber}: ${message}`);
    return { sent: false, reason: "twilio_not_configured" };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: targetNumber,
    });

    console.log(`[SMS] Sent to ${targetNumber}, sid=${result.sid}`);

    return { sent: true, sid: result.sid };
  } catch (error) {
    console.error("[notify] Failed to send SMS via Twilio:", error.message);

    return { sent: false, reason: error.message };
  }
};

// Send a WhatsApp alert to a user's mobile number using Twilio WhatsApp API
const sendWhatsAppAlert = async (mobile, message) => {
  const targetNumber = normalizePhoneNumber(mobile);
  if (!targetNumber) {
    console.warn("[notify] No mobile number on file, skipping WhatsApp:", message);
    return { sent: false, reason: "no_mobile_number" };
  }

  // Twilio WhatsApp sandbox default number: +14155238886
  const rawSender = TWILIO_WHATSAPP_NUMBER || "+14155238886";
  const fromWhatsApp = rawSender.startsWith("whatsapp:")
    ? rawSender
    : `whatsapp:${rawSender}`;

  const toWhatsApp = `whatsapp:${targetNumber}`;

  if (!twilioClient) {
    console.log(`\n================== [WHATSAPP MOCK ALERT] ==================`);
    console.log(`To:   ${toWhatsApp}`);
    console.log(`From: ${fromWhatsApp}`);
    console.log(`Message:\n${message}`);
    console.log(`===========================================================\n`);
    return { sent: false, reason: "twilio_not_configured" };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: fromWhatsApp,
      to: toWhatsApp,
    });

    console.log(`[WhatsApp] Sent to ${toWhatsApp}, sid=${result.sid}`);

    return { sent: true, sid: result.sid };
  } catch (error) {
    console.error("[notify] Failed to send WhatsApp message:", error.message);

    return { sent: false, reason: error.message };
  }
};

module.exports = {
  sendSmsAlert,
  sendWhatsAppAlert,
  normalizePhoneNumber,
};
