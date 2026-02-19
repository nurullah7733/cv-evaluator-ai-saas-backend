const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// PDF to Text
async function extractTextFromPDF(filePath) {
  const data = await pdfParse(fs.readFileSync(filePath));
  return data.text.trim();
}

// DOCX  to Text
async function extractTextFromDOCX(filePath) {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value.trim();
}

//  Smart Extractor (PDF, DOCX, বা TXT)
async function extractTextSmart(filePath) {
  if (filePath.endsWith(".pdf")) return extractTextFromPDF(filePath);
  if (filePath.endsWith(".docx")) return extractTextFromDOCX(filePath);
  if (filePath.endsWith(".txt"))
    return fs.readFileSync(filePath, "utf8").trim();

  throw new Error("Unsupported file type for text extraction.");
}

module.exports = { extractTextFromPDF, extractTextFromDOCX, extractTextSmart };
