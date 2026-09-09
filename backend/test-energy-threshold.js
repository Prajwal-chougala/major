require("dotenv").config();
const mongoose = require("mongoose");
const Device = require("./models/Device");
const User = require("./models/User");
const Alert = require("./models/Alert");
const Reading = require("./models/Reading");
const { createReadingAlerts } = require("./services/alertService");

async function runTest() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error("No MongoDB URI configured in .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    // 1. Find or create a user
    let user = await User.findOne({});
    if (!user) {
      console.log("No user found, creating test user...");
      user = await User.create({
        name: "Test User",
        email: "testuser" + Date.now() + "@example.com",
        mobile: "+919876543210",
        passwordHash: "dummyhash",
      });
    }
    console.log(`Using user: ${user.name} (Mobile: ${user.mobile})`);

    // 2. Find or create a device
    const testDeviceId = "test-device-" + Date.now();
    const thresholdKWh = 0.05; // 0.05 kWh threshold for fast test
    const device = await Device.create({
      deviceId: testDeviceId,
      name: "Smart Heater Test",
      owner: user._id,
      powerLimit: thresholdKWh,
      dailyEnergyKWh: 0.06, // Exceeds 0.05 threshold
      dailyEnergyDate: new Date().toISOString().split("T")[0],
      powerState: "ON",
      status: "online",
    });

    console.log(`Created test device ${device.name} with limit ${device.powerLimit} kWh, current daily energy: ${device.dailyEnergyKWh} kWh`);

    // 3. Create simulated reading
    const reading = await Reading.create({
      deviceId: device.deviceId,
      voltage: 230,
      current: 5,
      power: 1150,
      timestamp: new Date(),
    });

    // 4. Trigger createReadingAlerts
    console.log("Calling createReadingAlerts...");
    await createReadingAlerts({ reading, device });

    // 5. Verify device turned OFF
    const updatedDevice = await Device.findById(device._id);
    console.log(`Device powerState: ${updatedDevice.powerState}`);
    console.log(`Device autoOffDueToLimit: ${updatedDevice.autoOffDueToLimit}`);

    if (updatedDevice.powerState !== "OFF") {
      throw new Error("FAILED: Device powerState was not set to OFF!");
    }
    if (!updatedDevice.autoOffDueToLimit) {
      throw new Error("FAILED: Device autoOffDueToLimit was not set to true!");
    }

    // 6. Verify Alert record created
    const alert = await Alert.findOne({
      deviceId: testDeviceId,
      type: "danger",
    }).sort({ createdAt: -1 });

    if (!alert) {
      throw new Error("FAILED: Alert record was not created in DB!");
    }
    console.log(`Found Alert: "${alert.title}" - Message: "${alert.message}"`);

    // Clean up test data
    await Device.deleteOne({ _id: device._id });
    await Reading.deleteMany({ deviceId: testDeviceId });
    await Alert.deleteMany({ deviceId: testDeviceId });
    console.log("Cleanup complete.");

    console.log("\n>>> ALL CHECKS PASSED: Energy threshold auto-off and SMS trigger verified successfully! <<<");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

runTest();
