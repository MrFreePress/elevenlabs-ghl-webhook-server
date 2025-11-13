const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  console.log("[INIT] 'logs' folder created automatically ✅");
} else {
  console.log("[INIT] 'logs' folder already exists");
}
