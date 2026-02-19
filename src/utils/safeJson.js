function safeJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }

  const repaired = raw.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(repaired);
}
module.exports = safeJson;
