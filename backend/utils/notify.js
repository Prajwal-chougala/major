// Handles outbound SMS alerts via Twilio.
// If Twilio credentials aren't configured yet, falls back to logging so the
// rest of the app keeps working during local development.

let twilioClient = null;

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
} = process.env;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
  const twilio = require("twilio");
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn(
    "[notify] Twilio credentials not set (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER). " +
      "SMS alerts will be logged to the console instead of actually sent."
  );
}

// Send an SMS alert to a user's mobile number (expects E.164 format, e.g. +15551234567).
const sendSmsAlert = async (mobile, message) => {
  if (!mobile) {
    console.warn("[notify] No mobile number on file, skipping SMS:", message);
    return { sent: false, reason: "no_mobile_number" };
  }

  if (!twilioClient) {
    console.log(`[SMS MOCK] To ${mobile}: ${message}`);
    return { sent: false, reason: "twilio_not_configured" };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: mobile,
    });

    console.log(`[SMS] Sent to ${mobile}, sid=${result.sid}`);

    return { sent: true, sid: result.sid };
  } catch (error) {
    console.error("[notify] Failed to send SMS via Twilio:", error.message);

    return { sent: false, reason: error.message };
  }
};

module.exports = {
  sendSmsAlert,
};
