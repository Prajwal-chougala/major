const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createPowerThresholdService,
} = require("../services/powerThresholdService");

const createHarness = ({ alertPhone = "", userMobile = "+919876543210" } = {}) => {
  const alerts = [];
  const sentMessages = [];
  const scheduledTimers = [];
  let latestPower = 100;

  const device = {
    _id: { toString: () => "device-1" },
    owner: "owner-1",
    deviceId: "heater-1",
    name: "Space Heater",
    location: "Bedroom",
    powerState: "ON",
    powerThresholdW: 100,
    autoOffMinutes: 1,
    alertPhone,
    powerAlertActive: false,
    autoOffDueToLimit: false,
    save: async () => {},
  };

  const service = createPowerThresholdService({
    AlertModel: {
      create: async (alert) => alerts.push(alert),
    },
    DeviceModel: {
      updateOne: async () => {
        if (device.powerAlertActive) return { modifiedCount: 0 };
        device.powerAlertActive = true;
        return { modifiedCount: 1 };
      },
      findById: async () => device,
    },
    ReadingModel: {
      findOne: () => ({
        sort: () => ({
          lean: async () => ({ power: latestPower }),
        }),
      }),
    },
    UserModel: {
      findById: async () => ({
        mobile: userMobile,
        mobileNumber: userMobile,
      }),
    },
    sendSms: async (mobile, message) => {
      sentMessages.push({ mobile, message });
      return { sent: true };
    },
    setTimer: (callback, delay) => {
      const timer = { callback, delay, cleared: false };
      scheduledTimers.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      timer.cleared = true;
    },
  });

  return {
    alerts,
    device,
    scheduledTimers,
    sentMessages,
    service,
    setLatestPower: (power) => {
      latestPower = power;
    },
  };
};

test("exact threshold equality alerts once and routes SMS to device number", async () => {
  const harness = createHarness({ alertPhone: "9876543210" });
  const reading = { power: 100 };

  await harness.service.checkPowerThreshold({
    reading,
    device: harness.device,
  });
  await harness.service.checkPowerThreshold({
    reading,
    device: harness.device,
  });

  assert.equal(harness.alerts.length, 1);
  assert.equal(harness.sentMessages.length, 1);
  assert.equal(harness.sentMessages[0].mobile, "9876543210");
  assert.match(harness.alerts[0].message, /100\.0 W/);
  assert.equal(harness.scheduledTimers.length, 1);
  assert.equal(harness.scheduledTimers[0].delay, 60_000);
});

test("falls back to the account mobile number when the device has no recipient", async () => {
  const harness = createHarness({ userMobile: "+919999999999" });
  await harness.service.checkPowerThreshold({
    reading: { power: 125 },
    device: harness.device,
  });

  assert.equal(harness.sentMessages[0].mobile, "+919999999999");
});

test("recovery clears the countdown and a later threshold crossing alerts again", async () => {
  const harness = createHarness();
  await harness.service.checkPowerThreshold({
    reading: { power: 100 },
    device: harness.device,
  });
  const firstTimer = harness.scheduledTimers[0];

  await harness.service.checkPowerThreshold({
    reading: { power: 99.9 },
    device: harness.device,
  });
  assert.equal(firstTimer.cleared, true);
  assert.equal(harness.device.powerAlertActive, false);

  await harness.service.checkPowerThreshold({
    reading: { power: 100 },
    device: harness.device,
  });
  assert.equal(harness.alerts.length, 2);
  assert.equal(harness.sentMessages.length, 2);
  assert.equal(harness.scheduledTimers.length, 2);
});

test("auto-off confirms the cutoff with an in-app alert and SMS", async () => {
  const harness = createHarness();
  await harness.service.checkPowerThreshold({
    reading: { power: 120 },
    device: harness.device,
  });
  harness.setLatestPower(125);

  await harness.scheduledTimers[0].callback();

  assert.equal(harness.device.powerState, "OFF");
  assert.equal(harness.device.autoOffDueToLimit, true);
  assert.equal(harness.alerts.length, 2);
  assert.match(harness.alerts[1].message, /automatically turned off/);
  assert.equal(harness.sentMessages.length, 2);
  assert.match(harness.sentMessages[1].message, /automatically turned OFF/);
  assert.match(harness.sentMessages[1].message, /125\.0 W/);
});

test("below-threshold readings do not activate alerts or auto-off", async () => {
  const harness = createHarness();
  await harness.service.checkPowerThreshold({
    reading: { power: 99.9 },
    device: harness.device,
  });

  assert.equal(harness.alerts.length, 0);
  assert.equal(harness.sentMessages.length, 0);
  assert.equal(harness.scheduledTimers.length, 0);
});
