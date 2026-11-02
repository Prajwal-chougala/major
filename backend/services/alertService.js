const Alert = require("../models/Alert");
const Device = require("../models/Device");
const User = require("../models/User");
const { sendSmsAlert, sendWhatsAppAlert } = require("../utils/notify");

const POWER_WARNING_KW = 1.0;
const POWER_DANGER_KW = 2.0;

const AUTO_OFF_MINUTES = Number(process.env.AUTO_OFF_MINUTES) || 5;

// In-memory: deviceId (Mongo _id string) -> timeoutId for a pending
// auto-off. Resets if the server restarts (see README/known limitations).
const autoOffTimers = new Map();

// Called from deviceController when a user manually turns a device off/on,
// so a stale timer doesn't switch it off again after the user already acted.
const clearAutoOffTimer = (deviceObjectId) => {
  const key = deviceObjectId.toString();

  if (autoOffTimers.has(key)) {
    clearTimeout(autoOffTimers.get(key));
    autoOffTimers.delete(key);
  }
};

const dispatchSmsAlert = (device, mobile, message) => {
  sendSmsAlert(mobile, message)
    .then((result) => {
      if (!result.sent) {
        console.error(
          `[alerts] SMS delivery failed for ${device.name}:`,
          result.reason
        );
      }
    })
    .catch((error) => {
      console.error(`[alerts] SMS delivery failed for ${device.name}:`, error);
    });
};

// If the latest power reading exceeds the device's watt limit, alert once and
// schedule an auto turn-off unless the reading falls or the user turns it off.
const checkPowerLimit = async ({ reading, device }) => {
  const powerW = Number(reading.power);
  if (
    device.powerLimit == null ||
    !Number.isFinite(powerW) ||
    powerW <= device.powerLimit
  ) {
    clearAutoOffTimer(device._id);
    return;
  }

  const key = device._id.toString();

  // Already alerted + timer running for this device - don't spam.
  if (autoOffTimers.has(key)) {
    return;
  }

  const minutes = device.autoOffMinutes || AUTO_OFF_MINUTES;

  await Alert.create({
    owner: device.owner,
    device: device._id,
    deviceId: device.deviceId,
    type: "danger",
    title: "Power Limit exceeded",
    message: `${device.name} is consuming ${powerW.toFixed(
      1
    )} W, above its ${device.powerLimit} W limit. It will auto turn OFF in ${minutes} min unless the power drops or it is turned off sooner.`,
    severity: "critical",
    isRead: false,
  });

  const user = await User.findById(device.owner);
  const targetMobile =
    device.alertPhone ||
    (user ? (user.mobile || user.mobileNumber) : null);

  dispatchSmsAlert(
    device,
    targetMobile,
    `WattWise ALERT: "${device.name}" is using ${powerW.toFixed(
      1
    )} W, above its ${device.powerLimit} W limit. It will auto turn OFF in ${minutes} min if the power stays above the limit.`
  );

  const whatsAppMsg =
    `⚠️ *WattWise Power Limit Warning!*\n\n` +
    `Device: *${device.name}*\n` +
    `Current Power: *${powerW.toFixed(1)} W*\n` +
    `Power Limit: *${device.powerLimit} W*\n\n` +
    `⏱️ *Auto turn-OFF in ${minutes} minutes* if the power stays above the limit.`;

  sendWhatsAppAlert(targetMobile, whatsAppMsg);

  const timeoutId = setTimeout(async () => {
    try {
      const dev = await Device.findById(device._id);

      if (dev && dev.powerState === "ON") {
        dev.powerState = "OFF";
        dev.autoOffDueToLimit = true;
        await dev.save();

        console.log(
          `[SYSTEM] Auto-turned off device ${dev.name} after ${minutes} min above its power limit.`
        );

        await Alert.create({
          owner: dev.owner,
          device: dev._id,
          deviceId: dev.deviceId,
          type: "info",
          title: "Device auto turned off",
          message: `${dev.name} was automatically turned off after remaining above its power limit.`,
          severity: "high",
          isRead: false,
        });

        const u = await User.findById(dev.owner);
        const offMobile =
          dev.alertPhone ||
          (u ? (u.mobile || u.mobileNumber) : null);

        dispatchSmsAlert(
          dev,
          offMobile,
          `WattWise: "${dev.name}" was automatically turned OFF after remaining above its ${device.powerLimit} W power limit.`
        );

        const whatsAppOffMsg =
          `🔌 *WattWise Safety Action*\n\n` +
          `Device: *${dev.name}* was *automatically turned OFF* after remaining above its power limit.`;

        sendWhatsAppAlert(offMobile, whatsAppOffMsg);
      }
    } catch (error) {
      console.error("Auto-off timer error:", error);
    }

    autoOffTimers.delete(key);
  }, minutes * 60 * 1000);

  autoOffTimers.set(key, timeoutId);
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

        // Dispatch an instant WhatsApp warning for dangerous critical load spikes
        if (type === "danger") {
          const user = await User.findById(device.owner);
          const targetMobile =
            device.alertPhone ||
            (user ? (user.mobile || user.mobileNumber) : null);
          const spikeMsg =
            `🚨 *WattWise Critical Load Alert!*\n\n` +
            `Device: *${device.name}*\n` +
            `Current Load: *${Number(reading.power).toFixed(1)} W* (Above 2 kW critical limit)\n` +
            `Time: *${new Date().toLocaleTimeString()}*`;
          sendWhatsAppAlert(targetMobile, spikeMsg);
        }
      }
    }

    // Per-device watt limit: alert + SMS + WhatsApp + auto-off countdown.
    await checkPowerLimit({ reading, device });
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