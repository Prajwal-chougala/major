const express = require("express");

const router = express.Router();

const {
  getPowerChart,
} = require("../controllers/powerChartController");

const authenticate = require("../middleware/authMiddleware");

router.get(
  "/",
  authenticate,
  getPowerChart
);

module.exports = router;