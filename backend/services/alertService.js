const Alert = require("../models/Alert");
const Device = require("../models/Device");
const User = require("../models/User");
const { sendSmsAlert } = require("../utils/notify");

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

// If the latest reading reaches the device's watt limit, alert once and start
// the auto-off countdown until the reading falls or the user turns it off.
const checkPowerLimit = async ({ reading, device }) => {
  const powerW = Number(reading.power);
  const powerLimitW = Number(device.powerLimit);
  if (
    device.powerLimit == null ||
    !Number.isFinite(powerW) ||
    !Number.isFinite(powerLimitW) ||
    powerW < powerLimitW
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
    title: "Power limit reached",
    message: `${device.name} has reached or exceeded its ${powerLimitW} W power limit (current usage: ${powerW.toFixed(
      1
    )} W). It will automatically turn OFF in ${minutes} min if usage stays at or above the limit.`,
    severity: "critical",
    isRead: false,
  });

  const user = await User.findById(device.owner);
  const targetMobile =
    device.alertPhone ||
    (user ? (user.mobile || user.mobileNumber) : null);

  const appliance = device.location
    ? `"${device.name}" at ${device.location}`
    : `"${device.name}"`;

  dispatchSmsAlert(
    device,
    targetMobile,
    `WattWise ALERT: ${appliance} is using ${powerW.toFixed(
      1
    )} W (limit: ${powerLimitW} W). If usage stays at or above the limit, it will automatically turn OFF in ${minutes} min.`
  );

  const timeoutId = setTimeout(async () => {
    try {
      const dev = await Device.findById(device._id);

      if (dev && dev.powerState === "ON") {
        dev.powerState = "OFF";
        dev.autoOffDueToLimit = true;
        await dev.save();

        console.log(
          `[SYSTEM] Auto-turned off device ${dev.name} after ${minutes} min at or above its power limit.`
        );

        await Alert.create({
          owner: dev.owner,
          device: dev._id,
          deviceId: dev.deviceId,
          type: "info",
          title: "Device auto turned off",
          message: `${dev.name} was automatically turned off after remaining at or above its power limit.`,
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
          `WattWise: "${dev.name}" was automatically turned OFF after remaining at or above its ${dev.powerLimit} W power limit.`
        );

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

      }
    }

    // Per-device watt limit: in-app alert, SMS, and auto-off countdown.
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