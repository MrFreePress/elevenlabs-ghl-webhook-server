// services/elevenlabs.js
const { createOrUpdateContact, addNote } = require("./ghl");
const winston = require("winston");
const fs = require("fs");
const path = require("path");

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
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/elevenlabs.log", level: "info" }),
    new winston.transports.File({ filename: "logs/elevenlabs-error.log", level: "error" }),
  ],
});

// ---------------------------
// Save Incoming Webhook JSON
// ---------------------------
function saveIncomingWebhook(body) {
  try {
    const dir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const lastFile = path.join(dir, "last_webhook.json");
    const historyFile = path.join(dir, "webhooks_history.json");

    // 1️⃣ Save last webhook
    fs.writeFileSync(lastFile, JSON.stringify(body, null, 2));

    // 2️⃣ Append history (up to last 3)
    let history = [];
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, "utf-8") || "[]");
    }

    history.push({
      receivedAt: new Date().toISOString(),
      body: body
    });

    if (history.length > 3) {
      history = history.slice(history.length - 3);
    }

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

  } catch (err) {
    console.error("Webhook JSON save error:", err);
  }
}

// ---------------------------
// Environment / Mode Settings
// ---------------------------
const TEST_MODE = process.env.NODE_ENV !== "production";

/**
 * ElevenLabs webhook handler
 */
async function elevenWebhookHandler(req, res) {
  try {
    const body = req.body || {};

    // 🔥 Save full incoming webhook JSON
    saveIncomingWebhook(body);

    const phone   = body.phone || body.caller_id || null;
    const name    = body.name || body.userName || null;
    const company = body.company || body.businessName || null;

    const transcript =
      body.transcript ||
      (body.messages ? body.messages.map(m => m.text).join("\n") : null);

    const agentId = body.agentId || null;
    const callSid = body.callSid || null;

    // Call time (fallback to None)
    const startTime = body.start_time || "None";
    const endTime   = body.end_time   || "None";

    // 1️⃣ Validate phone
    if (!phone) {
      logger.warn("Missing phone number in ElevenLabs webhook payload");
      return res.status(400).send("phone is required");
    }

    logger.info("Received ElevenLabs webhook", {
      phone,
      name,
      company,
      agentId,
      startTime,
      endTime
    });

    // 2️⃣ Upsert contact
    const contact = await createOrUpdateContact({
      name: name || "",
      company: company || "",
      phone
    });

    const contactId =
      contact?.id ||
      contact?.contact?.id ||
      contact?.data?.id;

    if (!contactId) {
      logger.error("Failed to extract contactId after create/update", {
        rawContactResponse: contact
      });
      return res.status(500).send("Could not determine contact ID");
    }

    logger.info("GHL contact created/updated", { contactId });

    // 3️⃣ Add transcript note
    const reference = callSid ? ` (Call SID: ${callSid})` : ` (${phone})`;
    const transcriptText = transcript || "No transcript provided.";

    const noteBody =
      `📝 Transcript${reference}:\n` +
      `📞 Call Start: ${startTime}\n` +
      `📞 Call End:   ${endTime}\n\n` +
      transcriptText;

    await addNote(contactId, noteBody);

    logger.info("Transcript note saved", { contactId });

    return res.status(200).send("ElevenLabs webhook processed successfully");

  } catch (err) {
    logger.error("Error processing ElevenLabs webhook", {
      error: err?.response?.data || err.message,
      stack: err.stack,
    });

    return res.status(500).send("Error processing ElevenLabs webhook");
  }
}

module.exports = { elevenWebhookHandler };
