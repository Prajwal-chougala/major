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

// If the device has a user-configured powerLimit and this reading exceeds
// it: create a critical alert, send an SMS, and schedule an auto turn-off
// unless the user turns the device off manually first.
const checkPowerLimit = async ({ reading, device }) => {
  if (!device.powerLimit || Number(reading.power) <= device.powerLimit) {
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
    title: "Power limit exceeded",
    message: `${device.name} is using ${Number(reading.power).toFixed(
      1
    )} W, above its ${device.powerLimit} W limit. It will auto turn OFF in ${minutes} min unless turned off sooner.`,
    severity: "critical",
    isRead: false,
  });

  const user = await User.findById(device.owner);

  sendSmsAlert(
    user ? user.mobile : null,
    `WattWise ALERT: "${device.name}" is using ${Number(reading.power).toFixed(
      1
    )}W, above its ${device.powerLimit}W limit. It will auto turn OFF in ${minutes} min unless you turn it off sooner.`
  );

  const timeoutId = setTimeout(async () => {
    try {
      const dev = await Device.findById(device._id);

      if (dev && dev.powerState === "ON") {
        dev.powerState = "OFF";
        await dev.save();

        console.log(
          `[SYSTEM] Auto-turned off device ${dev.name} after ${minutes} min timeout.`
        );

        await Alert.create({
          owner: dev.owner,
          device: dev._id,
          deviceId: dev.deviceId,
          type: "info",
          title: "Device auto turned off",
          message: `${dev.name} was automatically turned off after exceeding its power limit.`,
          severity: "high",
          isRead: false,
        });

        const u = await User.findById(dev.owner);

        sendSmsAlert(
          u ? u.mobile : null,
          `WattWise: "${dev.name}" was automatically turned OFF to save energy after exceeding its power limit.`
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

    // Per-device configured limit: alert + SMS + auto-off countdown.
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