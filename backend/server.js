require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const readingRoutes = require("./routes/readingRoutes");
const energyRoutes = require("./routes/energyRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const energyChartRoutes = require("./routes/energyChartRoutes");
const powerChartRoutes = require("./routes/powerChartRoutes");
const alertRoutes = require("./routes/alertRoutes");
const ingestRoutes = require("./routes/ingestRoutes");
const app = express();

app.use(helmet());

app.use(
  cors({
    origin: [process.env.CLIENT_URL, "http://127.0.0.1:3000", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use(apiLimiter);

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend Working",
  });
});

// Health check endpoint for Render/monitoring
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/devices", deviceRoutes);
app.use("/readings", readingRoutes);
app.use("/energy", energyRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/energy/chart", energyChartRoutes);
app.use("/power/chart", powerChartRoutes);
app.use("/alerts", alertRoutes);
app.use("/ingest", ingestRoutes);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

startServer();