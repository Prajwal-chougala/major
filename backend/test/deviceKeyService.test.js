const assert = require("node:assert/strict");
const test = require("node:test");
const {
  regenerateDeviceApiKey,
} = require("../services/deviceKeyService");

test("regeneration is scoped to the owning user and replaces the old key", async () => {
  const oldKey = "old-device-key";
  const device = {
    apiKey: oldKey,
    saved: false,
    save: async function () {
      this.saved = true;
    },
  };
  let query;
  const DeviceModel = {
    findOne: async (filter) => {
      query = filter;
      return filter.owner === "owner-1" ? device : null;
    },
  };

  const newKey = await regenerateDeviceApiKey(
    "heater-1",
    "owner-1",
    DeviceModel
  );
  assert.deepEqual(query, { deviceId: "heater-1", owner: "owner-1" });
  assert.equal(device.saved, true);
  assert.equal(device.apiKey, newKey);
  assert.notEqual(newKey, oldKey);
  assert.match(newKey, /^[a-f0-9]{48}$/);

  const otherOwnerKey = await regenerateDeviceApiKey(
    "heater-1",
    "owner-2",
    DeviceModel
  );
  assert.equal(otherOwnerKey, null);
});
