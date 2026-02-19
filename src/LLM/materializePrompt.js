// materialize-prompt.js
const fs = require("fs");
const path = require("path");

const SYSTEM = `You are a precise resume materializer. Your job is to APPLY a previous “improvements” JSON onto a raw resume text and produce a single updated resume text.

Global principles:
- Truthfulness first: DO NOT fabricate companies, dates, titles, tools, or numbers.
- Numeric-proofing: Keep %/counts ONLY if the same (or stricter) numbers exist in BASE_MESSY_TEXT or PREV_IMPROVEMENTS_JSON; otherwise convert to dignified qualitative phrasing (e.g., "improved client satisfaction").
- Idempotency: Treat lists as sets. Do not insert exact duplicates (skills, tech, bullets, keywords).
- No cross-section promotion: Do not convert Projects into Experience or vice versa unless BASE_MESSY_TEXT clearly labels them that way.

STRICT_SECTION_GUARDS:
- Personal Info guard: Build a "Personal Info" section ONLY from candidate identity present; never use reference, experience, or project lines. Ignore any identities found under "References". Do not fabricate missing fields.
- Header preserve: If a candidate identity line exists, preserve it verbatim at the top as the "Personal Info" section.
- Identity guard: Derive candidate identity from BASE_MESSY_TEXT (full name, email, phone). Any block containing a different person’s name, email, or phone → classify as References/Other, NEVER Experience.
- Reference cues: Lines containing "Reference", "Ref:", "Phone:", "Email:", or a third-party person/role (e.g., "English lecturer ...") → must be placed under References/Other, NEVER under Experience.
- Project cues: Headings/keywords like "Personal projects", "Projects", or known project names from improvements.projects[*].name → must be placed under Projects, not Experience.
- Employer evidence: Apply experience[i].afterBullets ONLY if you can match by jobIndex to an existing role OR soft-match a plausible role by (title and/or company). Prefer jobIndex; if more than one plausible match exists, SKIP and log in appliedOps with op:"skip".
- Education institutions must NOT become employers. University/College/School lines remain in Education.
- Opaque/ambiguous roles (e.g., a platform like "ostad.app" without clear employment phrasing) → do NOT uplift to Experience unless BASE_MESSY_TEXT explicitly indicates the candidate held that role.

Section mapping (apply only when the guard passes):
• summary.after → REPLACE the summary paragraph; also include summary.keywordsAdded terms inline if missing (dedupe).
• experience[i].afterBullets → APPEND bullets under the matching role (prefer jobIndex; else soft-match). If not matched safely, op:"skip". Use appliedOps.op="add" for appends; use "replace" only if you truly replace the whole bullet block.
• skills.afterGrouped → MERGE into skills groups; keep sensible grouping (Frontend/Backend/Databases/Tools/Languages/Core); no dupes.
• projects[].afterDesc/tech/impact/url → match by project name (case-insensitive); refine description; merge tech (no dupes). If name not found, op:"skip".
• certifications/awards: DO NOT fabricate entries; keep empty if none.

Formatting & dedupe rules:
• HARD ORDER: Sections MUST appear in this exact order → Personal Info → Summary → Experience → Projects → Skills → Education → (Certifications) → (Awards) → (References/Other). If Projects exists, it MUST come immediately after Experience (before Skills).
• Bullets must be SINGLE LINE each; no mid-sentence line breaks anywhere.
• Candidate full name MUST be on a single line (e.g., "Matthew Eliot"), not split across lines.
• Collapse multiple spaces/tabs; trim trailing spaces.
• Remove duplicate bullets/lines within the same section (case- & punctuation-insensitive).
• In comma/pipe/slash-separated skill/tech lists, keep unique terms only; preserve first-occurrence order.
• If a "Programming Languages:" line duplicates items already present under Skills groups, remove the redundant line to avoid repetition.

Output format (STRICT JSON):
Return ONLY:
{
  "updatedMessyTextToMaterializeText": "<string – final updated resume text>",
  "appliedOps": [ { "op": "add|replace|skip", "path": "<target e.g., summary, experience[0].bullets>", "reason": "<short>" } ]
}`;

function MaterializePromptBuildMessages(messyText, prevImprovements) {
  // Accept either a JSON string or an object for prevImprovements
  const prevImprovementsStr =
    typeof prevImprovements === "string"
      ? prevImprovements
      : JSON.stringify(prevImprovements || {}, null, 2);

  let userPrompt = `BASE_MESSY_TEXT:
"""
{{messyText}}
"""

PREV_IMPROVEMENTS_JSON:
"""
{{prevImprovements}}
"""

TASK:
1) Build a source-of-truth map from BASE_MESSY_TEXT:
   - candidateIdentity: {fullName(s), email(s), phone(s)}
   - headings+sections present (Summary/Experience/Projects/Skills/Education/Certifications/Awards/References)
   - known employers (company/title pairs) and project names
   - reference blocks (third-party names/phones/emails)

2) Apply PREV_IMPROVEMENTS_JSON using STRICT_SECTION_GUARDS:
   - Experience bullets: APPEND where jobIndex exists; else soft-match by (title and/or company). Ambiguous → op:"skip".
   - Project edits: only if project name matches (case-insensitive). Otherwise op:"skip".
   - Use appliedOps.op="add" for appends, "replace" only when replacing an entire block.

3) Enforce numeric-proofing and idempotency across all insertions. Do NOT paraphrase beyond what improvements/base already say.

4) Ensure the HARD section order and formatting/dedupe rules are respected.

5) Return ONLY the strict JSON with fields: updatedMessyTextToMaterializeText, appliedOps.
`;

  userPrompt = userPrompt
    .replace(/\{\{messyText\}\}/g, messyText || "")
    .replace(/\{\{prevImprovements\}\}/g, prevImprovementsStr);

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: userPrompt },
  ];
}

module.exports = { MaterializePromptBuildMessages };
