// services/elevenlabs.js
const { createOrUpdateContact, addNote } = require("./ghl");
const winston = require("winston");

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
// ElevenLabs Webhook Handler
// ----------------------
async function elevenWebhookHandler(req, res) {
  try {
    const body = req.body || {};
    logger.info("Incoming ElevenLabs Webhook Body:", body);

    // -------------------------------
    // 🔥 Extract from new ElevenLabs format
    // -------------------------------
    const data = body?.data || {};

    // Caller phone number
    const phone =
      data?.conversation_initiation_client_data?.dynamic_variables?.system__caller_id ||
      null;

    // Call SID
    const callSid =
      data?.conversation_initiation_client_data?.dynamic_variables?.system__call_sid ||
      null;

    // Transcript array → text
    const transcriptArray = data?.transcript || [];
    const transcript = transcriptArray
      .map(t => `${t.role.toUpperCase()}: ${t.message}`)
      .join("\n");

    // Convert unix times
    const startTime = data?.metadata?.start_time_unix_secs
      ? new Date(data.metadata.start_time_unix_secs * 1000).toISOString()
      : "Unknown";

    const endTime = data?.metadata?.accepted_time_unix_secs
      ? new Date(data.metadata.accepted_time_unix_secs * 1000).toISOString()
      : "Unknown";

    // -------------------------------
    // 🔴 Validate required fields
    // -------------------------------
    if (!phone) {
      logger.warn("Missing caller_id in webhook payload");
      return res.status(400).send("caller_id is required");
    }

    logger.info("Extracted Caller Info", {
      phone,
      callSid,
      startTime,
      endTime
    });

    // -------------------------------
    // 🔥 Create or Update GHL Contact
    // -------------------------------
    const contact = await createOrUpdateContact({
      phone,
      name: "",
      company: ""
    });

    const contactId =
      contact?.id ||
      contact?.contact?.id ||
      contact?.data?.id;

    if (!contactId) {
      logger.error("Failed to extract contact ID", { contact });
      return res.status(500).send("Could not determine contact ID");
    }

    logger.info("GHL Contact Created/Updated", { contactId });

    // -------------------------------
    // 🔥 Add Transcript Note
    // -------------------------------
    const noteBody =
      `📝 ElevenLabs Call Transcript\n` +
      `📞 Caller: ${phone}\n` +
      `🆔 Call SID: ${callSid}\n` +
      `⏳ Start: ${startTime}\n` +
      `⏳ End: ${endTime}\n\n` +
      transcript;

    await addNote(contactId, noteBody);
    logger.info("Transcript Note Saved", { contactId });

    return res.status(200).send("Webhook processed successfully");

  } catch (err) {
    logger.error("Error processing ElevenLabs webhook", {
      error: err?.response?.data || err.message,
      stack: err.stack
    });

    return res.status(500).send("Error processing webhook");
  }
}

module.exports = { elevenWebhookHandler };
