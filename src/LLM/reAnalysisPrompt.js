const fs = require("fs");
const path = require("path");

const SYSTEM = `You are a precise, no-nonsense resume evaluator.
Always return STRICT JSON matching the provided JSON schema.
Do NOT add any prose outside the JSON. If something is unknown, use null or [].
Act differently for actor="candidate" vs "hiring_manager" (see rules in the user message).
Compute ALL fields including premiumInsights and salaryPercentiles (p25/p50/p75).
For fields that the backend will compute (salary.position, salary.deltaToMedianPct, salary.recommendedAsk), set them to null.
Keep all scores as integers 0–100. Use ISO 4217 currency codes.`;

const schemaStr = fs.readFileSync(
  path.join(__dirname, "./promptOutputSchema.json"),
  "utf8"
);

function ReAnalysisBuildMessages(
  messyText,
  jdText,
  region,
  industry = null,
  actor, // "candidate" | "hiring_manager"
  persona = null, // "entry_level" | "professional_level" | null
  desiredSalary = null,
  prevImprovements = null
) {
  let userPrompt = `MODE: reanalysis

RESUME_TEXT (latest user-edited):
"""
{{messyText}}
"""

TARGET JD (used for ATS/keywords):
"""
{{jdText}}
"""

CONTEXT (from UI):
- jdText: (optional) {{jdText}}                     # target JD
- Actor (required): {{actor}}                       # "candidate" | "hiring_manager"
- Persona (optional): {{persona}}                   # "entry_level" | "professional_level" | null
- Region (required): {{region}}                     # e.g., "Bangladesh", "India - Bangalore", "Germany - Berlin"
- Industry (optional): {{industry}}                 # e.g., "Software/Web" | null
- Desired Salary (optional, integer): {{desiredSalary}}

PREV_IMPROVEMENTS_JSON (from previous run; treat as context, not ground truth):
"""
{{prevImprovements}}
"""

OPERATIONAL NOTES (reanalysis):
- Use PREV_IMPROVEMENTS_JSON only to AVOID duplication and to carry forward helpful changes.
  If PREV_IMPROVEMENTS_JSON is empty or "null", ignore it (no diffing/removals; only add new improvements and ops).

- Merge policy:
  * Keep or refine changes that are still relevant given the current JD/resume.
  * Drop obsolete changes (e.g., JD changed, or the resume already reflects them naturally).
  * Add new improvements only where there are fresh gaps (ATS missing / keywordGaps / structure issues).
- Idempotency:
  * De-duplicate skills, keywords, project tech and suggestions arrays (treat arrays as sets).
  * Do not re-insert the same exact string twice anywhere (case-insensitive for suggestions.text).
- Numeric-proofing (STRICT, applies to ALL generated text):
  * Keep numeric claims (%/counts like "30%" or "12 endpoints") ONLY if they appear verbatim in RESUME_TEXT.
  * If not present, convert to dignified qualitative phrasing (e.g., "improved", "reduced", "enhanced"). Never invent numbers.

BEHAVIOR RULES:
- If actor="candidate":
  - If persona is null, infer "entry_level" or "professional_level" with confidence 0–1.
  - Coaching tone allowed; concrete suggestions welcome.
  - Optional sections (certifications, awards, publications, volunteer):
    · If non-empty → improve wording/relevance.
    · If empty → produce at least one suggestion for that section (to-do phrasing). Never fabricate entries.
- If region is empty → infer probable region from resume text (e.g., personalInfo.location).
- If actor="hiring_manager": compact managerView; avoid coaching tone.

TASKS (same schema as before):
1) scores.overall (0–100)
2) breakdown: structure/language/keywords/experience (each 0–100)
3) jobFit: score, keywordMatch, skillsAlignment, benchmark
4) interview: probability + 1-line rationale + benchmark + confidence
5) salary (region="{{region}}" if provided else inferred): min, max, currency, confidence; echo desired → salary.desired; keep salary.position/deltaToMedianPct/recommendedAsk = null
6) suggestions (3–6 baseline; may exceed to cover required terms):
   - Imperative one-liners; targetSection ∈ ["summary","experience","education","projects","skills","general","certifications","awards"]; priority 1–3.
   - If resumeSections.certifications=[], include ≥1 suggestion with targetSection="certifications".
   - If resumeSections.awards=[], include ≥1 suggestion with targetSection="awards".
   - Coverage rule: For EVERY term in optimization.keywordGaps[] AND premiumInsights.atsCoverage.missing[].term, include ≥1 suggestion containing that exact term (case-insensitive) with a concrete targetSection.
   - Top3→suggestions (STRICT MIRROR): For EVERY string in premiumInsights.atsCoverage.top3Actions[], create a **separate** suggestions[] item that mirrors the text verbatim (priority=1) with an inferred targetSection. Do not merge a Top3 action into another combined line.
   - Summary wording guard:
     · If resumeSections.summary.content is null/empty → you MAY suggest "Add a Summary section …".
     · Else → NEVER say "Add a summary section"; instead "Refine your summary …" including exact missing terms (e.g., "RESTful APIs", "Docker", "TypeScript").
   - De-dup guard (FINALIZE STEP): before returning, remove duplicate suggestions by text(case-insensitive).

7) optimization: certifications[], languages[], skills[], achievements[], keywordGaps[]
   - languages = human languages only (e.g., "English", "Bangla"). Programming languages (e.g., "JavaScript", "TypeScript") must go under skills/improvements.skills (not optimization.languages).

8) careerPaths (2–3) + accelerators[]
9) trends (direction, note, monthlyGrowth string like "+15%")
10) marketInsights: regionalDemand, competitionLevel("High"/"Medium"/"Low"), optimalTiming|null, demandDrivers[]
11) premiumInsights (ALWAYS):
    - atsCoverage: { exactPct, partialPct, stemPct, missing[{term, weight 0–1}], top3Actions[string] }
      * Top 3 Actions (exactly 3):
        · Derive deterministically: (1) highest-weight missing terms, (2) highest-severity skillGaps, (3) biggest quick-win by impact/lowest breakdown score.
        · These three are quick wins only; not exhaustive.
    - skillGaps: [{skill, severity 0–100}]
    - impact: [{section, score 0–100, evidence}]  // evidence must obey numeric-proofing
    - compPercentile (0–100)
    - salaryPercentiles (region): p25, p50, p75, currency
    - trendDrilldown (region): sparkline[12 numbers], risingSkills[]
    - certsAndCourses[], recruiterPitch[], shortlist[], redFlags[]

12) resumeSections (Always):
    - personalInfo, summary, experience[], education[], skills, projects[], 
      certifications[], awards[], publications[], volunteer[], additional
    - **additional.references MUST be an array of strings** (e.g., ["John Doe - Manager", "Jane Smith - CEO"]).
      If no references, use [] (empty array), NOT null or string.
    - Normalize text; parse dates consistently; do not fabricate.

CONSISTENCY & REANALYSIS RULES (critical):
- Keyword Gaps → Suggestions coverage:
  * For EVERY term in optimization.keywordGaps[] AND premiumInsights.atsCoverage.missing[].term, include ≥1 suggestions[] item with that exact term + concrete targetSection.
- Skills Gaps echo:
  * improvements.skills.keywordGaps MUST exactly mirror optimization.keywordGaps (same items/order if possible).
- Region & Persona echo:
  * If "{{region}}" provided → salary.region MUST equal it; else infer from resume and use that. interview.benchmark must reference the effective region/persona.
- Top3 → Suggestions & Improvements (auto-apply, augment-only):
  * For EVERY string in premiumInsights.atsCoverage.top3Actions[]:
    - Ensure a matching item exists in suggestions[] (priority=1; inferred targetSection; idempotent; text mirrored verbatim).
    - ALSO apply a concrete, truthful change in the corresponding improvements.* section. This AUGMENTS existing improvements; do NOT remove or replace other improvements.
  * Section mapping (case-insensitive; prefer explicit section words; else heuristics):
    - "summary"/headline terms (e.g., "Full Stack"): ensure improvements.summary.after contains the exact term and append to improvements.summary.keywordsAdded (no duplicates).
    - "skills"/explicit skills (e.g., "RESTful APIs", "Docker", "TypeScript"): ensure improvements.skills.afterGrouped includes the exact term under a sensible group (Frontend/Backend/Databases/Tools/Languages/Core). Avoid duplicates; arrays behave like sets.
    - "experience"/"achievements"/"metrics": append ≥1 active-voice, truthful bullet to the most relevant improvements.experience[i].afterBullets mentioning the term. **Numeric-proofing applies strictly** (no invented %/counts).
    - "projects": update one relevant improvements.projects item (afterDesc and/or tech[]) to include the exact term (avoid duplicates in tech[]). If the action mentions "Docker"/containerization, ensure at least one project's tech[] includes "Docker" and the afterDesc references containerization truthfully.
    - "certifications"/"awards": if resumeSections.certifications/awards is empty → do NOT fabricate entries; keep improvements.certifications/awards = []; still add a suggestion and log an improvements.ops hint path.
- Reanalysis diffing with PREV_IMPROVEMENTS_JSON:
  * Do NOT re-add identical items that already exist in the new improvements.* output.
  * If a prior change is now obsolete, omit it and add an improvements.ops item with { "op": "remove", "path": "<old path>" }.
  * If you refine a prior change, use "replace" in ops at the exact path, with the new value.
  * All new deltas you add now should also be logged in ops with "add" at the exact path.
- Idempotency:
  * Arrays behave like sets; avoid duplicate strings anywhere (summary.keywordsAdded, skills groups, projects.tech, suggestions texts).

IMPROVEMENTS (must strictly align to resumeSections):
- summary: single rewritten paragraph; truthful; **numeric-proofing applies**.
- experience: for each resumeSections.experience[i] → { jobIndex, jobId|null, afterTitle|null, afterCompany|null, afterPeriod|null, afterBullets[] }.
- skills: { afterGrouped: { "<Group>": [skills...] }, keywordGaps[] } — keywordGaps must mirror optimization.keywordGaps exactly.
- projects: { name, afterDesc, impact, tech[], url } — **numeric-proofing applies**.
- education: { degree, institution, graduationYear|null }.
- certifications/awards: if none in resume, return []; do NOT fabricate.
- sectionsOrder: ["summary","experience","skills","projects","education","certifications"].
- ops (patch trace; idempotent):
  * Every add/replace/remove you perform this run must be logged in improvements.ops.
  * **ops.path MUST be an absolute JSON Pointer starting with /improvements/...** (no relative/short paths).

OUTPUT CONTRACT:
- Return ONLY raw JSON validating EXACTLY against the existing schema (no extra top-level fields).
- CRITICAL JSON RULES:
  * Properly escape strings (\"); no unescaped newlines/tabs; no trailing commas; standard ASCII quotes.
  * Unknown → null or [].

MISSING-SECTION RULES:
- If certifications=[], include at least one suggestion with targetSection="certifications".
- If awards=[], include at least one suggestion with targetSection="awards".

JSON_SCHEMA:
${schemaStr}`;

  userPrompt = userPrompt
    .replace(/\{\{messyText\}\}/g, messyText || "")
    .replace(/\{\{jdText\}\}/g, jdText || "")
    .replace(/\{\{region\}\}/g, region || "")
    .replace(/\{\{industry\}\}/g, industry || "null")
    .replace(/\{\{actor\}\}/g, actor || "")
    .replace(/\{\{\persona\}\}/g, persona || "null")
    .replace(/\{\{desiredSalary\}\}/g, desiredSalary || "null")
    .replace(
      /\{\{prevImprovements\}\}/g,
      prevImprovements ? JSON.stringify(prevImprovements) : ""
    );

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: userPrompt },
  ];
}

module.exports = { ReAnalysisBuildMessages };
