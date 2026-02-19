const fs = require("fs");

async function verifyFileSignature(filePath) {
  const fd = await fs.promises.open(filePath, "r");
  try {
    const { buffer } = await fd.read(Buffer.alloc(5), 0, 5, 0);
    const signature = buffer.toString();

    if (signature === "%PDF-") {
      return "PDF";
    } else if (signature.startsWith("PK")) {
      return "DOCX"; // DOCX files typically start with "PK" (ZIP format)
    } else if (signature.trim().length === 0) {
      return "TXT"; // TXT files may not have a specific signature
    } else {
      return "UNKNOWN";
    }
  } finally {
    await fd.close();
  }
}

module.exports = { verifyFileSignature };
