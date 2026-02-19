const cleanPdfRawText = (rawText) => {
  return String(rawText)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\t+/g, " ")
    .trim();
};

module.exports = cleanPdfRawText;
