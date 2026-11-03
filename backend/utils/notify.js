const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  const rawPhone = String(phone).trim();
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (
    digits.length === 12 &&
    digits.startsWith("91") &&
    /^[6-9]/.test(digits.slice(2))
  ) {
    return `+${digits}`;
  }
  return null;
};

const getSmsConfiguration = () => {
  const apiKey = (process.env.FAST2SMS_API_KEY || "").trim();
  const configured = apiKey.length > 0;

  return {
    configured,
    apiKeyConfigured: configured,
    reason: configured ? "" : "Add your Fast2SMS API key in SMS Settings.",
  };
};

const sendSmsAlert = async (mobile, message) => {
  const targetNumber = normalizePhoneNumber(mobile);
  if (!targetNumber) {
    return {
      sent: false,
      reason: "Fast2SMS supports Indian mobile numbers. Enter a valid 10-digit number or +91 number.",
    };
  }

  const apiKey = (process.env.FAST2SMS_API_KEY || "").trim();
  if (!apiKey) {
    return {
      sent: false,
      reason: "Fast2SMS is not configured. Add your API key in SMS Settings.",
    };
  }

  const url = new URL(FAST2SMS_URL);
  url.searchParams.set("route", "q");
  url.searchParams.set("numbers", targetNumber.slice(-10));
  url.searchParams.set("message", message);
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
      const reason =
        result?.message || `Fast2SMS returned HTTP ${response.status}.`;
      console.error("[Fast2SMS] SMS request rejected:", reason);
      return {
        sent: false,
        reason: Array.isArray(reason) ? reason.join(", ") : String(reason),
      };
    }

    return {
      sent: true,
      sid: result.request_id,
      status: "accepted",
      gateway: "Fast2SMS",
      details: result.message,
    };
  } catch (error) {
    console.error("[Fast2SMS] SMS request failed:", error.message);
    return {
      sent: false,
      reason:
        error.name === "TimeoutError"
          ? "Fast2SMS request timed out. Check your connection and account."
          : "Could not connect to Fast2SMS. Check your connection and try again.",
    };
  }
};

module.exports = {
  getSmsConfiguration,
  normalizePhoneNumber,
  sendSmsAlert,
};
