const mongoose = require("mongoose");

const readingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    voltage: {
      type: Number,
      required: true,
      min: 0,
    },

    current: {
      type: Number,
      required: true,
      min: 0,
    },

    power: {
      type: Number,
      required: true,
      min: 0,
    },

    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Speeds up queries such as:
// "Give me readings for this device during this time period."
readingSchema.index({
  deviceId: 1,
  timestamp: -1,
});

module.exports = mongoose.model(
  "Reading",
  readingSchema
);