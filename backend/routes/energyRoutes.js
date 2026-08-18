const express = require("express");

const router = express.Router();

const {
  getDeviceEnergy,
} = require("../controllers/energyController");

const authenticate = require("../middleware/authMiddleware");

router.get(
  "/device/:deviceId",
  authenticate,
  getDeviceEnergy
);

module.exports = router;