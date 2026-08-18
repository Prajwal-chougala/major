const express = require("express");

const router = express.Router();

const {
  getEnergyChart,
} = require("../controllers/energyChartController");

const authenticate = require("../middleware/authMiddleware");

router.get(
  "/",
  authenticate,
  getEnergyChart
);

module.exports = router;