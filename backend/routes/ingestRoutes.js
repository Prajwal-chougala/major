const express = require("express");

const router = express.Router();

const {
  ingestReading,
  getIngestStatus,
} = require("../controllers/ingestController");

const authenticateDevice = require("../middleware/apiKeyMiddleware");


// Hardware posts a sensor reading here.
//   POST /ingest
//   Headers: x-api-key: <device apiKey>
//   Body: { "voltage": 230, "current": 5.2, "power": 1196 }
router.post("/", authenticateDevice, ingestReading);

// Hardware polls this to know whether it should be ON or OFF right now.
//   GET /ingest/status
//   Headers: x-api-key: <device apiKey>
router.get("/status", authenticateDevice, getIngestStatus);


module.exports = router;
