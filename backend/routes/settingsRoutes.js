const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const {
  getSettings,
  updateProfile,
  updateTwilioConfig,
  updateCallMeBotConfig,
} = require("../controllers/settingsController");

router.get("/", authenticate, getSettings);
router.put("/profile", authenticate, updateProfile);
router.post("/twilio", authenticate, updateTwilioConfig);
router.post("/callmebot", authenticate, updateCallMeBotConfig);

module.exports = router;

