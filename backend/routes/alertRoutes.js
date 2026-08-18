const express = require("express");

const router = express.Router();

const {
  getAlerts,
  getRecentAlerts,
  markAlertAsRead,
} = require("../controllers/alertController");

const authenticate = require("../middleware/authMiddleware");

// All alert endpoints require authentication
router.get(
  "/",
  authenticate,
  getAlerts
);

router.get(
  "/recent",
  authenticate,
  getRecentAlerts
);

router.patch(
  "/:id/read",
  authenticate,
  markAlertAsRead
);

module.exports = router;