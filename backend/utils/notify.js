const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

const normalizePhoneNumber = (phone) => {
  if (typeof phone !== "string" && typeof phone !== "number") return null;

  const rawPhone = String(phone).trim();
  const compactPhone = rawPhone.replace(/[\s()-]/g, "");

  if (/^[6-9]\d{9}$/.test(compactPhone)) return `+91${compactPhone}`;
  if (/^\+91[6-9]\d{9}$/.test(compactPhone)) return compactPhone;
  return null;
};

const getSmsConfiguration = () => ({
  configured: Boolean((process.env.FAST2SMS_API_KEY || "").trim()),
  provider: "Fast2SMS",
});

// --- Nodemailer transporter setup ---
let emailTransporter = null;
let isEthereal = false;

const nodemailer = require("nodemailer");

const initEmailTransporter = async () => {
  if (emailTransporter) return emailTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (Number(process.env.SMTP_PORT) || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log("[notify] Production SMTP Email transporter configured.");
    return emailTransporter;
  }

  // Fallback: Create Ethereal test account so real test emails can be sent & previewed in browser
  try {
    const testAccount = await nodemailer.createTestAccount();
    emailTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEthereal = true;
    console.log(`[notify] Configured Ethereal Email test account (${testAccount.user}).`);
    return emailTransporter;
  } catch (err) {
    console.warn("[notify] Could not create Ethereal test account:", err.message);
    return null;
  }
};

const sendSmsAlert = async (mobile, message) => {
  const normalizedPhone = normalizePhoneNumber(mobile);
  if (!normalizedPhone) {
    return {
      sent: false,
      reason:
        "Enter a valid Indian mobile number in 10-digit or +91 format.",
    };
  }

  const apiKey = (process.env.FAST2SMS_API_KEY || "").trim();
  if (!apiKey) {
    return {
      sent: false,
      reason: "Fast2SMS is not configured on the server.",
    };
  }

  const url = new URL(FAST2SMS_URL);
  url.searchParams.set("route", "q");
  url.searchParams.set("numbers", normalizedPhone.slice(-10));
  url.searchParams.set("message", String(message));
  url.searchParams.set("sms_details", "1");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        authorization: apiKey,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || result?.return !== true) {
      const providerMessage = Array.isArray(result?.message)
        ? result.message.join(", ")
        : result?.message;
      const reason =
        providerMessage || `Fast2SMS returned HTTP ${response.status}.`;
      console.error("[Fast2SMS] SMS request rejected:", reason);
      return { sent: false, reason: String(reason) };
    }

    return {
      sent: true,
      sid: result.request_id || null,
      status: "accepted",
      gateway: "Fast2SMS",
    };
  } catch (error) {
    const timedOut =
      error.name === "TimeoutError" || error.name === "AbortError";
    const reason = timedOut
      ? "Fast2SMS request timed out."
      : "Could not connect to Fast2SMS.";
    console.error("[Fast2SMS] SMS request failed:", error.message);
    return { sent: false, reason };
  }
};

// Send an email alert to a user's email address with modern HTML template.
const sendEmailAlert = async (email, subject, message, customHtml = null) => {
  if (!email) {
    console.warn("[notify] No email on file, skipping email:", message);
    return { sent: false, reason: "no_email" };
  }

  const transporter = await initEmailTransporter();

  if (!transporter) {
    console.log(`[EMAIL MOCK] To ${email}: [${subject}] ${message}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"WattWise System" <no-reply@wattwise.io>';
  
  const isDanger = subject.toLowerCase().includes("off") || subject.toLowerCase().includes("danger") || subject.toLowerCase().includes("threshold");
  const badgeBg = isDanger ? "#ef4444" : "#f59e0b";
  const badgeText = isDanger ? "CRITICAL ALERT" : "WARNING";

  const defaultHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e1b4b, #312e81, #0284c7); padding: 32px 28px; text-align: left;">
          <div style="display: inline-block; background: ${badgeBg}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
            ${badgeText}
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.3;">
            ⚡ WattWise Energy Alert
          </h1>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 28px;">
          <h2 style="color: #0f172a; font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">
            ${subject}
          </h2>
          <div style="background-color: #f8fafc; border-left: 4px solid ${isDanger ? '#ef4444' : '#f59e0b'}; padding: 18px 20px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
              ${message}
            </p>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            Please review your smart energy dashboard to inspect live telemetry and adjust your device energy limits if required.
          </p>
          
          <!-- Action Button -->
          <div style="text-align: center; margin: 28px 0 12px 0;">
            <a href="${process.env.CLIENT_URL || 'https://major-six-amber.vercel.app/'}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #0284c7); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Open WattWise Dashboard →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            This is an automated notification from WattWise Smart Energy System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: subject,
      text: message,
      html: customHtml || defaultHtml,
    });

    let previewUrl = null;
    if (isEthereal) {
      previewUrl = nodemailer.getTestMessageUrl(result);
      console.log(`[EMAIL] Sent via Ethereal to ${email}. Preview URL: ${previewUrl}`);
    } else {
      console.log(`[EMAIL] Sent to ${email}, messageId=${result.messageId}`);
    }

    return { sent: true, messageId: result.messageId, previewUrl };
  } catch (error) {
    console.error("[notify] Failed to send email:", error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = {
  getSmsConfiguration,
  normalizePhoneNumber,
  sendSmsAlert,
  sendEmailAlert,
};
