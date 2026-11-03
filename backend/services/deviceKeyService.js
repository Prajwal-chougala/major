const crypto = require("crypto");
const Device = require("../models/Device");

const regenerateDeviceApiKey = async (
  deviceId,
  ownerId,
  DeviceModel = Device
) => {
  const device = await DeviceModel.findOne({
    deviceId,
    owner: ownerId,
  });
  if (!device) return null;

  device.apiKey = crypto.randomBytes(24).toString("hex");
  await device.save();
  return device.apiKey;
};

module.exports = { regenerateDeviceApiKey };
