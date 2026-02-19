const crypto = require("crypto");
const path = require("path");

function buildObjectKey({ userId, fileOriginalName }) {
  const ts = new Date();
  const y = ts.getUTCFullYear();
  const m = String(ts.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ts.getUTCDate()).padStart(2, "0");
  const safeName = path.basename(fileOriginalName).replace(/\s+/g, "_");
  // user-scoped, date partitioned, collision-safe
  return `cv-evaluator-pdfs/${userId}/${y}-${m}-${d}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}-${safeName}`;
}
module.exports = { buildObjectKey };
