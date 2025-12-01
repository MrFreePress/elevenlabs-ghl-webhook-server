// services/elevenlabs.js
const { createOrUpdateContact, addNote } = require("./ghl");
const { extractAiData } = require("./ai");
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
// Phone Normalizer
// ----------------------
function normalizePhone(phone) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    digits = "1" + digits;
  }

  return "+" + digits;
}

// ----------------------
// ElevenLabs Webhook Handler
// ----------------------
async function elevenWebhookHandler(req, res) {
  try {
    const body = req.body || {};
    logger.info("Incoming ElevenLabs Webhook Body:", body);

    const data = body?.data || {};

    // Caller phone number
    const phoneRaw =
      data?.conversation_initiation_client_data?.dynamic_variables?.system__caller_id ||
      null;

    let phone = normalizePhone(phoneRaw);

    // ❗ REAL MODE — MUST HAVE REAL CALLER ID
    if (!phone) {
      logger.error("Missing caller_id → ElevenLabs did NOT send caller phone.");
      return res.status(400).send("Missing caller phone number (caller_id)");
    }

    // Call SID
    const callSid =
      data?.conversation_initiation_client_data?.dynamic_variables?.system__call_sid ||
      null;

    // Transcript array → text
    const transcriptArray = data?.transcript || [];
    const transcript = transcriptArray
      .map((t) => `${t.role.toUpperCase()}: ${t.message}`)
      .join("\n");

    // Convert unix times
    const startTime = data?.metadata?.start_time_unix_secs
      ? new Date(data.metadata.start_time_unix_secs * 1000).toISOString()
      : "Unknown";

    const endTime = data?.metadata?.accepted_time_unix_secs
      ? new Date(data.metadata.accepted_time_unix_secs * 1000).toISOString()
      : "Unknown";

    logger.info("Extracted Caller Info", {
      phone,
      callSid,
      startTime,
      endTime,
    });

    // -------------------------------
    // 🔥 AI — Extract Name, Email, Company, Summary
    // -------------------------------
    logger.info("Running AI extraction...");
    const ai = await extractAiData(transcript);
    logger.info("AI extracted data:", ai);

    // -------------------------------
    // 🔥 Create or Update GHL Contact
    // -------------------------------
    const contact = await createOrUpdateContact({
      firstName: ai?.firstName || "",
      lastName: ai?.lastName || "",
      email: ai?.email || "",
      company: ai?.companyName || ai?.businessName || "",
      phone,
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
    // 🔥 Add Call Details Note
    // -------------------------------
    const callDetailsNote =
      `📞 ElevenLabs Call Details\n` +
      `Caller: ${phone}\n` +
      `Call SID: ${callSid}\n` +
      `Start: ${startTime}\n` +
      `End: ${endTime}`;

    await addNote(contactId, callDetailsNote);

    // -------------------------------
    // 🔥 Add Transcript Note
    // -------------------------------
    const transcriptNote = `📝 Full Call Transcript\n\n${transcript}`;
    await addNote(contactId, transcriptNote);

    // -------------------------------
    // 🔥 Add AI Summary Note
    // -------------------------------
    const aiNote =
      `🤖 AI Summary\n` +
      `First Name: ${ai?.firstName}\n` +
      `Last Name: ${ai?.lastName}\n` +
      `Email: ${ai?.email}\n` +
      `Company: ${ai?.companyName || ai?.businessName}\n\n` +
      `Summary:\n${ai?.summary}`;

    await addNote(contactId, aiNote);

    return res.status(200).send("Webhook processed successfully");

  } catch (err) {
    logger.error("Error processing ElevenLabs webhook", {
      error: err?.response?.data || err.message,
      stack: err.stack,
    });

    return res.status(500).send("Error processing webhook");
  }
}

module.exports = { elevenWebhookHandler };
