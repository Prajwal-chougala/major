// Handles outbound SMS alerts via Twilio and email alerts via Nodemailer.
// If credentials aren't configured, falls back to logging so the
// rest of the app keeps working during local development.

let twilioClient = null;

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
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

// --- Nodemailer transporter setup ---
let emailTransporter = null;

const nodemailer = require("nodemailer");

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: (Number(SMTP_PORT) || 587) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  console.log("[notify] Email transporter configured.");
} else {
  console.warn(
    "[notify] SMTP credentials not set (SMTP_HOST / SMTP_USER / SMTP_PASS). " +
      "Email alerts will be logged to the console instead of actually sent."
  );
}

// Send an SMS alert to a user's mobile number (expects E.164 format, e.g. +919876543210 or +15551234567).
const sendSmsAlert = async (mobile, message) => {
  if (!mobile) {
    console.warn("[notify] No mobile number on file, skipping SMS:", message);
    return { sent: false, reason: "no_mobile_number" };
  }

  // Format mobile to E.164 format
  let cleanMobile = String(mobile).trim().replace(/[^0-9+]/g, "");
  if (!cleanMobile.startsWith("+")) {
    // If it's a 10-digit number (standard Indian mobile), prefix with +91
    if (cleanMobile.length === 10) {
      cleanMobile = "+91" + cleanMobile;
    } else {
      cleanMobile = "+" + cleanMobile;
    }
  }

  if (!twilioClient) {
    console.log(`[SMS MOCK] To ${cleanMobile}: ${message}`);
    return { sent: false, reason: "twilio_not_configured" };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: cleanMobile,
    });

    console.log(`[SMS] Sent to ${cleanMobile}, sid=${result.sid}`);

    return { sent: true, sid: result.sid };
  } catch (error) {
    console.error("[notify] Failed to send SMS via Twilio:", error.message);

    return { sent: false, reason: error.message };
  }
};

// Send an email alert to a user's email address.
const sendEmailAlert = async (email, subject, message) => {
  if (!email) {
    console.warn("[notify] No email on file, skipping email:", message);
    return { sent: false, reason: "no_email" };
  }

  if (!emailTransporter) {
    console.log(`[EMAIL MOCK] To ${email}: [${subject}] ${message}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    const result = await emailTransporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: email,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 16px;">
          <div style="background: linear-gradient(135deg, #35259B, #0EA5E9); padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">⚡ WattWise Alert</h1>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0;">${message}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated alert from WattWise Energy Management System.</p>
          </div>
        </div>
      `,
    });

    console.log(`[EMAIL] Sent to ${email}, messageId=${result.messageId}`);
    return { sent: true, messageId: result.messageId };
  } catch (error) {
    console.error("[notify] Failed to send email:", error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = {
  sendSmsAlert,
  sendEmailAlert,
};
