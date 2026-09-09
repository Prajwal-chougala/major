require("dotenv").config();
const { sendWhatsAppAlert, normalizePhoneNumber } = require("./utils/notify");

async function test() {
  console.log("=== Testing WattWise WhatsApp Alert Delivery ===");

  // Check phone normalization
  const sampleNumber = "9880331429";
  const normalized = normalizePhoneNumber(sampleNumber);
  console.log(`Phone normalization check: "${sampleNumber}" -> "${normalized}"`);

  // Target phone number: from argv or environment or mock
  const targetNumber = process.argv[2] || process.env.TEST_WHATSAPP_PHONE || "+919880331429";

  const message =
    `⚠️ *WattWise Energy Alert!*\n\n` +
    `Device: *Living Room AC*\n` +
    `Consumption: *5.42 kWh* today\n` +
    `Daily Limit: *5.00 kWh*\n\n` +
    `⏱️ Auto turn OFF scheduled in *5 minutes* unless turned off manually from your WattWise Dashboard.`;

  console.log(`Sending WhatsApp alert to: ${targetNumber}...`);
  const result = await sendWhatsAppAlert(targetNumber, message);

  console.log("Result:", result);
  console.log("=== Test Complete ===");
  process.exit(0);
}

test();
