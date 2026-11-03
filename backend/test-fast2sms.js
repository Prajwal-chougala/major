require("dotenv").config();

const { sendSmsAlert } = require("./utils/notify");

const run = async () => {
  const phone = process.env.TEST_SMS_NUMBER;
  if (!phone) {
    console.error("Set TEST_SMS_NUMBER to a valid Indian mobile number.");
    process.exitCode = 1;
    return;
  }

  const result = await sendSmsAlert(
    phone,
    "WattWise test SMS. Fast2SMS acceptance does not guarantee phone delivery."
  );
  if (!result.sent) {
    console.error("Fast2SMS test failed:", result.reason);
    process.exitCode = 1;
    return;
  }

  console.log("Fast2SMS accepted the test SMS. Phone delivery is not guaranteed.");
};

run().catch((error) => {
  console.error("Fast2SMS test failed:", error);
  process.exitCode = 1;
});
