const express = require("express");

const router = express.Router();

const {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  turnOnDevice,
  turnOffDevice,
  regenerateApiKey,
} = require("../controllers/deviceController");

const authenticate = require("../middleware/authMiddleware");


// Create device
router.post("/", authenticate, createDevice);

// Get all devices of logged-in user
router.get("/", authenticate, getDevices);

// Get one device
router.get("/:deviceId", authenticate, getDeviceById);

// Update device
router.put("/:deviceId", authenticate, updateDevice);

// Delete device
router.delete("/:deviceId", authenticate, deleteDevice);

// Manually turn a device on/off
router.post("/:deviceId/turn-on", authenticate, turnOnDevice);
router.post("/:deviceId/turn-off", authenticate, turnOffDevice);

// Regenerate a device's hardware API key
router.post("/:deviceId/regenerate-key", authenticate, regenerateApiKey);


module.exports = router;