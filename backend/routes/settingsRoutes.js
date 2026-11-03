const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const {
  getSettings,
  updateProfile,
  updateSmsConfig,
  sendTestSms,
} = require("../controllers/settingsController");

const router = express.Router();

router.get("/", authenticate, getSettings);
router.put("/profile", authenticate, updateProfile);
router.put("/sms", authenticate, updateSmsConfig);
router.post("/test-sms", authenticate, sendTestSms);

module.exports = router;
