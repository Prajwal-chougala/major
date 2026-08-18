const express = require("express");

const router = express.Router();

const {
  createReading,
  getDeviceReadings,
} = require("../controllers/readingController");

const authenticate = require("../middleware/authMiddleware");


// Store a new energy reading
router.post(
  "/",
  authenticate,
  createReading
);


// Get readings for a device
router.get(
  "/:deviceId",
  authenticate,
  getDeviceReadings
);


module.exports = router;