const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getSmsConfiguration,
  normalizePhoneNumber,
  sendSmsAlert,
} = require("../utils/notify");

const withSmsApiKey = async (apiKey, run) => {
  const previousKey = process.env.FAST2SMS_API_KEY;
  if (apiKey === undefined) {
    delete process.env.FAST2SMS_API_KEY;
  } else {
    process.env.FAST2SMS_API_KEY = apiKey;
  }

  try {
    await run();
  } finally {
    if (previousKey === undefined) {
      delete process.env.FAST2SMS_API_KEY;
    } else {
      process.env.FAST2SMS_API_KEY = previousKey;
    }
  }
};

test("normalizes supported Indian mobile number formats", () => {
  assert.equal(normalizePhoneNumber("9876543210"), "+919876543210");
  assert.equal(normalizePhoneNumber("+91 98765-43210"), "+919876543210");
  assert.equal(normalizePhoneNumber("+1 4155550123"), null);
  assert.equal(normalizePhoneNumber("1234567890"), null);
});

test("SMS configuration status never exposes the API key", async () => {
  await withSmsApiKey("private-test-key", async () => {
    const status = getSmsConfiguration();
    assert.deepEqual(status, { configured: true, provider: "Fast2SMS" });
    assert.equal(JSON.stringify(status).includes("private-test-key"), false);
  });
});

test("rejects invalid numbers and reports missing server credentials", async () => {
  const originalFetch = global.fetch;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
  };

  try {
    await withSmsApiKey("private-test-key", async () => {
      const invalid = await sendSmsAlert("12345", "test");
      assert.equal(invalid.sent, false);
      assert.match(invalid.reason, /valid Indian mobile number/);
      assert.equal(fetchCalled, false);
    });

    await withSmsApiKey(undefined, async () => {
      const unconfigured = await sendSmsAlert("9876543210", "test");
      assert.equal(unconfigured.sent, false);
      assert.match(unconfigured.reason, /not configured/);
      assert.equal(fetchCalled, false);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("reports provider rejection, network failure, and timeout without success", async () => {
  const originalFetch = global.fetch;
  try {
    await withSmsApiKey("private-test-key", async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ return: false, message: ["Rejected"] }),
      });
      const rejected = await sendSmsAlert("9876543210", "test");
      assert.equal(rejected.sent, false);
      assert.match(rejected.reason, /Rejected/);

      global.fetch = async () => {
        throw new Error("network details");
      };
      const networkFailure = await sendSmsAlert("9876543210", "test");
      assert.equal(networkFailure.sent, false);
      assert.match(networkFailure.reason, /connect/);

      global.fetch = async () => {
        const error = new Error("timeout");
        error.name = "TimeoutError";
        throw error;
      };
      const timeout = await sendSmsAlert("9876543210", "test");
      assert.equal(timeout.sent, false);
      assert.match(timeout.reason, /timed out/);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("sends a Quick SMS request and returns provider acceptance", async () => {
  const originalFetch = global.fetch;
  let requestUrl;
  let requestOptions;
  global.fetch = async (url, options) => {
    requestUrl = new URL(url);
    requestOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({ return: true, request_id: "request-1" }),
    };
  };

  try {
    await withSmsApiKey("private-test-key", async () => {
      const result = await sendSmsAlert("+91 98765 43210", "WattWise test");
      assert.deepEqual(
        { sent: result.sent, status: result.status, sid: result.sid },
        { sent: true, status: "accepted", sid: "request-1" }
      );
      assert.equal(requestUrl.searchParams.get("route"), "q");
      assert.equal(requestUrl.searchParams.get("numbers"), "9876543210");
      assert.equal(requestUrl.searchParams.get("message"), "WattWise test");
      assert.equal(requestOptions.headers.authorization, "private-test-key");
      assert.equal(JSON.stringify(result).includes("private-test-key"), false);
    });
  } finally {
    global.fetch = originalFetch;
  }
});
