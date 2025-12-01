// services/lookup.js
const { findContactByPhone, getContactNotes } = require("./ghl");
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

// -------------------------
// 🔍 LOOKUP HANDLER
// -------------------------
async function lookupHandler(req, res) {
  try {
    let phone = req.body?.phone;

    // -----------------------
    // ALWAYS USE FALLBACK IF PHONE MISSING
    // -----------------------
    if (!phone) {
      logger.warn("⚠ No phone provided → Using fallback test number +15555550123 (ALL ENVIRONMENTS)");
      phone = "+15555550123";
    }

    logger.info("Lookup request received", { phone });

    // -----------------------
    // STEP 1 → Find contact
    // -----------------------
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
        notes: null,
      });
    }

    logger.info("Contact FOUND", { contactId: contact.id });

    // -----------------------
    // STEP 2 → Fetch notes
    // -----------------------
    const notesList = await getContactNotes(contact.id);

    // -----------------------
    // STEP 3 → Extract transcript
    // -----------------------
    const transcriptNote = notesList.find((n) =>
      n.body?.startsWith("Full Call Transcript") ||
      n.body?.startsWith("📝 Full Call Transcript")
    );

    const transcript = transcriptNote
      ? transcriptNote.body.replace(/^📝 Full Call Transcript\n\n?/, "")
      : "";

    // -----------------------
    // STEP 4 → Combine all notes
    // -----------------------
    const allNotes = notesList.length
      ? notesList.map((n) => n.body).join("\n\n---\n\n")
      : "";

    // -----------------------
    // STEP 5 → Return response
    // -----------------------
    return res.json({
      found: true,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      company: contact.companyName || "",
      transcript,
      notes: allNotes,
    });

  } catch (error) {
    logger.error("Lookup error", { error: error.message });
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { lookupHandler };
