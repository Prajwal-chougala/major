require("dotenv").config();
const mongoose = require("mongoose");
const Device = require("./models/Device");

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB.");

    const collection = mongoose.connection.collection("devices");
    
    // Update devices using aggregation pipeline to copy field
    const result = await collection.updateMany(
      { owner: { $exists: false }, user: { $exists: true } },
      [{ $set: { owner: "$user" } }]
    );
    
    console.log(`Migrated ${result.modifiedCount} devices.`);
    
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

run();
