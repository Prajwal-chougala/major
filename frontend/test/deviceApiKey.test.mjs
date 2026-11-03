import assert from "node:assert/strict";
import test from "node:test";
import copyDeviceApiKey from "../src/utils/copyDeviceApiKey.mjs";

test("copies the complete hardware API key", async () => {
  let copiedText;
  await copyDeviceApiKey("a".repeat(48), {
    writeText: async (value) => {
      copiedText = value;
    },
  });

  assert.equal(copiedText, "a".repeat(48));
});

test("reports unavailable clipboard access", async () => {
  await assert.rejects(
    copyDeviceApiKey("device-key", undefined),
    /Clipboard access is unavailable/
  );
});
