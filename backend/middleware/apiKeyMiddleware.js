const Device = require("../models/Device");

// Used on hardware-facing routes (POST /ingest, GET /ingest/status).
// A microcontroller can't log in as a user, so each device instead gets a
// static apiKey (generated on the Device model) that it sends on every
// request via the 'x-api-key' header.
const authenticateDevice = async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      return res.status(401).json({
        message: "Missing device API key (x-api-key header).",
      });
    }

    const device = await Device.findOne({ apiKey });

    if (!device) {
      return res.status(401).json({
        message: "Invalid device API key.",
      });
    }

    req.device = device;

    next();
  } catch (error) {
    console.error("Device auth error:", error);

    return res.status(500).json({
      message: "Unable to authenticate device.",
    });
  }
};

module.exports = authenticateDevice;
