const Alert = require("../models/Alert");
const Device = require("../models/Device");
const User = require("../models/User");
const { sendSmsAlert, sendEmailAlert } = require("../utils/notify");

const POWER_WARNING_KW = 1.0;
const POWER_DANGER_KW = 2.0;

// Track which devices have already been alerted today to avoid spam.
// Key: deviceId string, Value: date string "YYYY-MM-DD"
const alertedToday = new Map();

// Called from deviceController when a user manually turns a device off/on,
// so we can reset the alert flag if needed.
const clearAutoOffTimer = (deviceIdentifier) => {
  if (!deviceIdentifier) return;
  const key = deviceIdentifier.toString();
  alertedToday.delete(key);
};

// If the device has a user-configured energy threshold (powerLimit in kWh) and its dailyEnergyKWh
// reaches or exceeds it: IMMEDIATELY turn off the device, create a critical alert, and send SMS + email.
const checkEnergyLimit = async ({ reading, device }) => {
  const thresholdKWh = Number(device.powerLimit);
  const currentEnergyKWh = Number(device.dailyEnergyKWh) || 0;

  if (!thresholdKWh || thresholdKWh <= 0 || currentEnergyKWh < thresholdKWh) {
    return;
  }

  const key = device._id.toString();

  // Check if we already alerted for this device today - don't spam.
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayStr = istNow.toISOString().split("T")[0];

  if (alertedToday.get(key) === todayStr && device.powerState === "OFF") {
    return;
  }

  alertedToday.set(key, todayStr);
  if (device.deviceId) {
    alertedToday.set(device.deviceId, todayStr);
  }

  // --- IMMEDIATELY turn off the device ---
  device.powerState = "OFF";
  device.autoOffDueToLimit = true;
  await device.save();

  console.log(
    `[SYSTEM] Energy threshold hit! Automatically turned OFF device "${device.name}" (${device.deviceId}) - Used ${currentEnergyKWh.toFixed(3)} kWh (Threshold: ${thresholdKWh} kWh).`
  );

  // Create alert in database
  await Alert.create({
    owner: device.owner,
    device: device._id,
    deviceId: device.deviceId,
    type: "danger",
    title: `Energy Threshold Hit — ${device.name} Turned OFF`,
    message: `${device.name} has consumed ${currentEnergyKWh.toFixed(
      3
    )} kWh today, reaching the threshold of ${thresholdKWh} kWh. The system has automatically turned OFF the device.`,
    severity: "critical",
    isRead: false,
  });

  // Fetch registered user for contact details
  const user = await User.findById(device.owner);
  const mobile = user ? (user.mobile || user.mobileNumber) : null;

  const alertMessage = `WattWise ALERT: "${device.name}" has reached your energy threshold with ${currentEnergyKWh.toFixed(
    3
  )} kWh consumed today (Threshold: ${thresholdKWh} kWh). The device has been automatically turned OFF.`;

  // Send SMS to user's registered number
  if (mobile) {
    console.log(`[ALERT] Sending threshold SMS to registered number: ${mobile}`);
    await sendSmsAlert(mobile, alertMessage);
  } else {
    console.warn(`[ALERT] No mobile number registered for user ${device.owner}, unable to send SMS.`);
  }

  // Send Email as secondary notification
  if (user && user.email) {
    await sendEmailAlert(
      user.email,
      `⚡ WattWise: "${device.name}" turned OFF - Energy threshold reached`,
      alertMessage
    );
  }
};

const createReadingAlerts = async ({
  reading,
  device,
}) => {
  try {
    const powerKW =
      Number(reading.power) / 1000;

    // High power warning
    if (powerKW >= POWER_WARNING_KW) {
      const severity =
        powerKW >= POWER_DANGER_KW
          ? "high"
          : "medium";

      const type =
        powerKW >= POWER_DANGER_KW
          ? "danger"
          : "warning";

      // Prevent duplicate alerts for the
      // same device within the last 15 minutes.
      const recentAlert =
        await Alert.findOne({
          owner: device.owner,
          device: device._id,
          type,
          title: "High power consumption",
          createdAt: {
            $gte: new Date(
              Date.now() -
                15 * 60 * 1000
            ),
          },
        });

      if (!recentAlert) {
        await Alert.create({
          owner: device.owner,
          device: device._id,
          deviceId: device.deviceId,
          type,
          title: "High power consumption",
          message:
            `${device.name} is consuming ${Number(
              reading.power
            ).toFixed(1)} W.`,
          severity,
          isRead: false,
        });
      }
    }

    // Per-device configured energy threshold: auto-turn off + SMS + alert.
    await checkEnergyLimit({ reading, device });
  } catch (error) {
    // Alert creation must not cause the
    // actual reading ingestion to fail.
    console.error(
      "Alert generation error:",
      error
    );
  }
};

module.exports = {
  createReadingAlerts,
  clearAutoOffTimer,
};