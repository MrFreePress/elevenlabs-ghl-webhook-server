// services/ghl.js
const axios = require("axios");
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
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/ghl.log", level: "info" }),
    new winston.transports.File({ filename: "logs/ghl-error.log", level: "error" }),
  ],
});

// ---------------------------
// Environment / Mode Settings
// ---------------------------
const TEST_MODE = process.env.NODE_ENV !== "production";

// Correct GHL Base URL
const GHL_BASE = "https://rest.gohighlevel.com/v1"; // REAL API


// ---------------------------
// Helper: GHL Headers
// ---------------------------
function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
  };
}


// ---------------------------
// Find Contact by Phone
// ---------------------------
async function findContactByPhone(phone) {
  try {
    if (!phone) return null;

    if (TEST_MODE) {
      logger.info("[TEST MODE] Simulating findContactByPhone", { phone });
      return { id: "mock-contact", phone };
    }

    logger.info("Searching GHL contact by phone", { phone });

    const url =
      `${GHL_BASE}/contacts/?locationId=` +
      encodeURIComponent(process.env.GHL_LOCATION_ID) +
      `&query=` +
      encodeURIComponent(phone);

    const { data } = await axios.get(url, { headers: ghlHeaders() });

    const list =
      data?.contacts?.contacts ||
      data?.contacts?.items ||
      data?.contacts ||
      data?.data ||
      [];

    if (!Array.isArray(list)) return null;

    const normalized = phone.replace(/\D/g, "");

    const contact =
      list.find((c) => (c.phone || "").replace(/\D/g, "") === normalized) ||
      list[0] ||
      null;

    if (contact) {
      logger.info("Found contact", { contactId: contact.id });
    } else {
      logger.info("No contact found", { phone });
    }

    return contact;
  } catch (err) {
    logger.error("Error finding contact", {
      phone,
      error: err?.response?.data || err.message,
    });
    return null;
  }
}


// ---------------------------
// Create or Update (Upsert) Contact
// ---------------------------
async function createOrUpdateContact({ name, company, phone }) {
  try {
    if (TEST_MODE) {
      logger.info("[TEST MODE] Simulating createOrUpdateContact", {
        name,
        company,
        phone,
      });
      return { id: "mock-upsert", name, company, phone };
    }

    logger.info("Creating/updating GHL contact", { name, company, phone });

    const payload = {
      locationId: process.env.GHL_LOCATION_ID,
      phone: phone || "",
      firstName: name || "",
      companyName: company || "",
    };

    const { data } = await axios.post(`${GHL_BASE}/contacts/`, payload, {
      headers: ghlHeaders(),
    });

    const contact =
      data?.contact || data?.contacts || data?.data || data || null;

    logger.info("GHL contact created/updated", {
      contactId: contact?.id,
      phone,
    });

    return contact;
  } catch (err) {
    logger.error("Error creating/updating contact", {
      phone,
      error: err?.response?.data || err.message,
    });
    throw err;
  }
}


// ---------------------------
// Add Note to Contact
// ---------------------------
async function addNote(contactId, noteBody) {
  if (!contactId || !noteBody) {
    logger.warn("Skipped addNote due to missing contactId or noteBody");
    return;
  }

  if (TEST_MODE) {
    logger.info("[TEST MODE] Simulating addNote", {
      contactId,
      noteBodyPreview: noteBody.slice(0, 40),
    });
    return;
  }

  try {
    await axios.post(
      `${GHL_BASE}/contacts/${contactId}/notes`,
      { body: noteBody },
      { headers: ghlHeaders() }
    );

    logger.info("Note added to contact", { contactId });
  } catch (err) {
    logger.error("Error adding note to contact", {
      contactId,
      error: err?.response?.data || err.message,
    });
  }
}


// ---------------------------
// Exports
// ---------------------------
module.exports = {
  findContactByPhone,
  createOrUpdateContact,
  addNote,
};
