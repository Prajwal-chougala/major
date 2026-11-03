const Alert = require("../models/Alert");
const Device = require("../models/Device");
const Reading = require("../models/Reading");
const User = require("../models/User");
const { sendSmsAlert } = require("../utils/notify");

const createPowerThresholdService = ({
  AlertModel = Alert,
  DeviceModel = Device,
  ReadingModel = Reading,
  UserModel = User,
  sendSms = sendSmsAlert,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  defaultAutoOffMinutes = Number(process.env.AUTO_OFF_MINUTES) || 5,
} = {}) => {
  const timers = new Map();

  const clearPowerAutoOffTimer = (deviceIdentifier) => {
    if (!deviceIdentifier) return;
    const key = deviceIdentifier.toString();
    const timer = timers.get(key);
    if (timer) {
      clearTimer(timer);
      timers.delete(key);
    }
  };

  const deliverSms = async (device, mobile, message) => {
    try {
      const result = await sendSms(mobile, message);
      if (!result.sent) {
        console.error(
          `[alerts] SMS delivery failed for ${device.name}:`,
          result.reason
        );
      }
    } catch (error) {
      console.error(`[alerts] SMS delivery failed for ${device.name}:`, error);
    }
  };

  const checkPowerThreshold = async ({ reading, device }) => {
    const powerW = Number(reading && reading.power);
    const thresholdW = Number(device.powerThresholdW);
    const key = device._id.toString();

    if (
      device.powerThresholdW == null ||
      !Number.isFinite(thresholdW) ||
      thresholdW <= 0 ||
      !Number.isFinite(powerW) ||
      powerW < thresholdW ||
      device.powerState !== "ON"
    ) {
      clearPowerAutoOffTimer(key);
      if (device.powerAlertActive) {
        device.powerAlertActive = false;
        await device.save();
      }
      return;
    }

    if (!device.powerAlertActive) {
      let newlyActivated = true;
      if (DeviceModel.updateOne) {
        const activation = await DeviceModel.updateOne(
          { _id: device._id, powerAlertActive: { $ne: true } },
          { $set: { powerAlertActive: true } }
        );
        if (activation.modifiedCount !== undefined) {
          newlyActivated = activation.modifiedCount > 0;
        }
      } else {
        device.powerAlertActive = true;
        await device.save();
      }
      device.powerAlertActive = true;

      if (newlyActivated) {
        await AlertModel.create({
          owner: device.owner,
          device: device._id,
          deviceId: device.deviceId,
          type: "danger",
          title: "Power limit reached",
          message: `${device.name} is using ${powerW.toFixed(
            1
          )} W, reaching or exceeding its ${thresholdW} W limit. It will automatically turn OFF if usage stays at or above the limit.`,
          severity: "critical",
          isRead: false,
        });

        const user = await UserModel.findById(device.owner);
        const mobile =
          device.alertPhone || (user ? user.mobile || user.mobileNumber : null);
        const appliance = device.location
          ? `"${device.name}" at ${device.location}`
          : `"${device.name}"`;
        const minutes =
          Number(device.autoOffMinutes) || defaultAutoOffMinutes;
        await deliverSms(
          device,
          mobile,
          `WattWise ALERT: ${appliance} is using ${powerW.toFixed(
            1
          )} W (limit: ${thresholdW} W). If usage stays at or above the limit, it will automatically turn OFF in ${minutes} min.`
        );
      }
    }

    if (!timers.has(key)) {
      const minutes = Number(device.autoOffMinutes) || defaultAutoOffMinutes;
      const timer = setTimer(async () => {
        timers.delete(key);
        try {
          const currentDevice = await DeviceModel.findById(device._id);
          if (
            !currentDevice ||
            currentDevice.powerState !== "ON" ||
            !currentDevice.powerAlertActive
          ) {
            return;
          }

          const latestReading = await ReadingModel.findOne({
            deviceId: currentDevice.deviceId,
          })
            .sort({ timestamp: -1 })
            .lean();
          const currentPowerW = Number(latestReading && latestReading.power);
          const currentLimitW = Number(currentDevice.powerThresholdW);

          if (
            !Number.isFinite(currentPowerW) ||
            !Number.isFinite(currentLimitW) ||
            currentPowerW < currentLimitW
          ) {
            currentDevice.powerAlertActive = false;
            await currentDevice.save();
            return;
          }

          currentDevice.powerState = "OFF";
          currentDevice.autoOffDueToLimit = true;
          currentDevice.powerAlertActive = false;
          await currentDevice.save();

          await AlertModel.create({
            owner: currentDevice.owner,
            device: currentDevice._id,
            deviceId: currentDevice.deviceId,
            type: "info",
            title: "Device auto turned off",
            message: `${currentDevice.name} was automatically turned off after remaining at or above its ${currentLimitW} W power limit for ${minutes} minutes.`,
            severity: "high",
            isRead: false,
          });

          const user = await UserModel.findById(currentDevice.owner);
          const mobile =
            currentDevice.alertPhone ||
            (user ? user.mobile || user.mobileNumber : null);
          await deliverSms(
            currentDevice,
            mobile,
            `WattWise: "${currentDevice.name}" was automatically turned OFF after remaining at or above its ${currentLimitW} W power limit for ${minutes} min. The latest reading was ${currentPowerW.toFixed(
              1
            )} W.`
          );
        } catch (error) {
          console.error("Power auto-off timer error:", error);
        }
      }, minutes * 60 * 1000);

      timers.set(key, timer);
    }
  };

  return { checkPowerThreshold, clearPowerAutoOffTimer };
};

const { checkPowerThreshold, clearPowerAutoOffTimer } =
  createPowerThresholdService();

module.exports = {
  checkPowerThreshold,
  clearPowerAutoOffTimer,
  createPowerThresholdService,
};
