require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const { getSmsConfiguration, sendSmsAlert } = require("./utils/notify");

const targetNumber = process.argv[2];
if (!targetNumber) {
  console.error("Usage: node test-fast2sms.js <10-digit-or-+91-recipient>");
  process.exitCode = 1;
} else if (!getSmsConfiguration().configured) {
  console.error("Fast2SMS is not configured:", getSmsConfiguration().reason);
  process.exitCode = 1;
} else {
  sendSmsAlert(targetNumber, "WattWise test SMS: your SMS alert settings are working.")
    .then((result) => {
      if (!result.sent) {
        console.error("Fast2SMS rejected the test SMS:", result.reason);
        process.exitCode = 1;
        return;
      }

      console.log(
        `Fast2SMS accepted the test SMS (request ID: ${result.sid || "not provided"}).`
      );
    })
    .catch((error) => {
      console.error("Test SMS failed:", error);
      process.exitCode = 1;
    });
}
