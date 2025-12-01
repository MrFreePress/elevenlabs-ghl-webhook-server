// services/lookup.js
const { findContactByPhone } = require("./ghl");
const winston = require("winston");

// Logging
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

// -------------------------
// 🔍 LOOKUP HANDLER
// -------------------------
async function lookupHandler(req, res) {
  try {
    const phone = req.body?.phone;

    if (!phone) {
      logger.warn("Missing phone in lookup request");
      return res.status(400).json({ error: "Missing phone" });
    }

    logger.info("Lookup request received", { phone });

    const contact = await findContactByPhone(phone);

    if (!contact) {
      logger.info("Contact NOT found");
      return res.json({
        found: false,
        firstName: null,
        lastName: null,
        email: null,
        company: null,
        transcript: null,
        notes: null
      });
    }

    logger.info("Contact FOUND", { contactId: contact.id });

    // Build response for ElevenLabs tool
    return res.json({
      found: true,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      company: contact.companyName || "",
      transcript: contact.transcript || "",
      notes: contact.notes || ""
    });

  } catch (error) {
    logger.error("Lookup error", { error: error.message });
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { lookupHandler };
