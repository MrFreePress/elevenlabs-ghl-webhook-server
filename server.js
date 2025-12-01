// server.js
const express = require("express");
const dotenv = require("dotenv");
const winston = require("winston");

dotenv.config();

// ----------------------
// Logging Setup
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
  transports: [new winston.transports.Console()],
});

// ----------------------
// Handlers
// ----------------------
const { elevenWebhookHandler } = require("./services/elevenlabs");
const { lookupHandler } = require("./services/lookup"); // 👈 YENİ EKLENİYOR

const app = express();

// ElevenLabs sends JSON requests
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // gerektiğinde HMAC için
    },
  })
);

// ----------------------
// Health Check
// ----------------------
app.get("/", (_req, res) => {
  logger.info("Health check accessed");
  res.status(200).send("ElevenLabs → GHL Webhook Server is running");
});

// ----------------------
// POST-CALL Webhook (Transcription)
// ----------------------
app.post("/elevenlabs", (req, res) => {
  logger.info("Incoming ElevenLabs POST-CALL Webhook:", req.body);
  return elevenWebhookHandler(req, res);
});

// ----------------------
// REALTIME LOOKUP Webhook (Before Call Starts)
// ----------------------
app.post("/lookup", (req, res) => {
  logger.info("Incoming ElevenLabs LOOKUP Webhook:", req.body);
  return lookupHandler(req, res);
});

// ----------------------
// Server Startup
// ----------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
  console.log(`Server listening on port ${PORT}`);
});
