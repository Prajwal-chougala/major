const mongoose = require("mongoose");
const crypto = require("crypto");

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    // Unique secret the physical sensor (ESP32/Arduino) uses to
    // authenticate against /ingest instead of a user JWT. Auto-generated
    // below if not supplied.
    apiKey: {
      type: String,
      unique: true,
      index: true,
    },

    // Power threshold in Watts. When a reading exceeds this, an alert +
    // SMS fires and an auto-off countdown starts. Null/0 = no limit set.
    powerLimit: {
      type: Number,
      default: null,
      min: 0,
    },

    // Minutes to wait after an over-limit reading before auto turn-off.
    // Falls back to AUTO_OFF_MINUTES env var when not set.
    autoOffMinutes: {
      type: Number,
      default: null,
      min: 1,
    },

    // Whether the appliance itself should currently be powered - distinct
    // from `status` above, which just tracks online/offline connectivity.
    // The ESP32 polls this via GET /ingest/status to drive its relay.
    powerState: {
      type: String,
      enum: ["ON", "OFF"],
      default: "ON",
    },
  },
  {
    timestamps: true,
  }
);

deviceSchema.pre("save", function () {
  if (!this.apiKey) {
    this.apiKey = crypto.randomBytes(24).toString("hex");
  }
});

module.exports = mongoose.model("Device", deviceSchema);