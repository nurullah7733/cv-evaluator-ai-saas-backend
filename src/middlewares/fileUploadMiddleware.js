const path = require("path");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

// portable tmp dir (Linux/Windows/macOS all good)
const TMP_DIR = os.tmpdir();

// simple filename slug
function safeBase(name) {
  return (
    name
      .toLowerCase()
      .replace(/\.[^/.]+$/, "") // drop ext
      .replace(/[^a-z0-9_]+/g, "_")
      .slice(0, 50) || "file"
  );
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    // ensure tmp dir exists (it should, but just in case)
    try {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    } catch {}
    cb(null, TMP_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || ".pdf" || ".docx" || ".txt";
    const name = safeBase(file.originalname);
    const rand = crypto.randomBytes(4).toString("hex");
    cb(null, `${name}-${Date.now()}-${rand}${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "text/plain", // TXT
  ];
  const allowedExts = /\.(pdf|docx|txt)$/i;

  const okMime = allowedMimes.includes(file.mimetype);
  const okExt = allowedExts.test(file.originalname || "");
  if (okMime && okExt) return cb(null, true);
  cb(
    new Error("Unsupported file format: only PDF, DOCX, and TXT allowed"),
    false
  );
};

exports.uploadFiles = multer({
  storage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
