const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      default: null,
    },

    deviceId: {
      type: String,
      trim: true,
      default: null,
    },

    type: {
      type: String,
      enum: [
        "warning",
        "danger",
        "success",
        "info",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    severity: {
      type: String,
      enum: [
        "low",
        "medium",
        "high",
        "critical",
      ],
      default: "medium",
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({
  owner: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Alert",
  alertSchema
);