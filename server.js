// server.js
const express = require("express");
const dotenv = require("dotenv");
const winston = require("winston");

dotenv.config();

// ----------------------
// Logging Setup (Optional)
// ----------------------
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length
        ? JSON.stringify(meta, null, 2)
        : "";
      return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${metaString}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/server.log", level: "info" }),
    new winston.transports.File({ filename: "logs/server-error.log", level: "error" }),
  ],
});

const { elevenWebhookHandler } = require("./services/elevenlabs");

const app = express();

// ElevenLabs sends JSON requests
app.use(express.json({ limit: "1mb" }));

// ----------------------
// Health Check
// ----------------------
app.get("/", (_req, res) => {
  logger.info("Health check accessed");
  res.status(200).send("ElevenLabs → GHL webhook is running");
});

// ----------------------
// ElevenLabs Webhook Endpoint
// ----------------------
app.post("/elevenlabs", elevenWebhookHandler);

// ----------------------
// Server Startup
// ----------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
  console.log(`Server listening on port ${PORT}`);
});
