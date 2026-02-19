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

function buildMessages(
  messyText,
  jdText,
  region,
  industry = null,
  actor, // "candidate" | "hiring_manager"
  persona = null, // "entry_level" | "professional_level" | null
  desiredSalary = null
) {
  // Prepare JSON-safe mirrors for inputs
  const industryJsonStr = industry == null ? "null" : JSON.stringify(industry);
  const personaJsonStr = persona == null ? "null" : JSON.stringify(persona);
  const desiredSalaryJsonStr =
    desiredSalary == null ? "null" : JSON.stringify(desiredSalary);

  let userPrompt = `RESUME_TEXT:
"""
{{messyText}}
"""

CONTEXT (from UI):
- Actor (required): {{actor}}                       # "candidate" | "hiring_manager"
- Persona (optional): {{persona}}                   # "entry_level" | "professional_level" | null
- Region (required): {{region}}                     # e.g., "Bangladesh", "India - Bangalore", "Germany - Berlin"
- Industry (optional): {{industry}}                 # e.g., "Software/Web" | null
- Desired Salary (optional, integer): {{desiredSalary}}   # same currency as output market data

TARGET JOB DESCRIPTION (used for ATS/keywords):
"""
{{jdText}}
"""

INPUTS (MIRROR THESE EXACTLY IN OUTPUT JSON UNDER "inputs"):
{
  "jdText": "{{jdText}}",
  "region": "{{region}}",
  "industry": {{industryJson}},
  "actor": "{{actor}}",
  "persona": {{personaJson}},
  "desiredSalary": {{desiredSalaryJson}}
}

BEHAVIOR RULES:
- If actor = "candidate":
  - If persona is null, INFER persona as "entry_level" or "professional_level", and return a confidence 0–1.
  - Coaching tone is allowed; produce concrete suggestions and optimization items.
  - For optional sections (certifications, awards, publications, volunteer):
    * If non-empty → improve wording, structure, or highlight relevance.
    * If empty → still generate at least one suggestion with targetSection matching that area, phrased as a to-do (e.g., "Consider adding a Certifications section with AWS or Docker certs").
    * Never fabricate; only propose relevant industry-standard items the candidate might pursue.
- If region is empty, INFER probable region from resume text (e.g., personalInfo.location).
- If actor = "hiring_manager":
  - Avoid coaching tone. Produce a compact managerView with:
    * summary (3–5 lines for decision makers),
    * redFlags[],
    * mustHaveCoverage (0–100) for must-have skills vs JD.
  - Suggestions may be empty or minimal.

NUMERIC-PROOFING (applies to ALL generated text: summary, experience, projects, recruiterPitch, impact evidence):
- Keep numeric claims (% / counts / deltas like "X% increase", "N users", "A → B") ONLY IF they appear verbatim in RESUME_TEXT or are explicitly verifiable from resume-provided artifacts.
- If a numeric claim is not present/verifiable, CONVERT to dignified qualitative phrasing (e.g., "improved user engagement", "reduced load time", "enhanced stability").
- NEVER invent percentages or hard numbers. Do not guess. When in doubt, use qualitative phrasing.
- Allowed: Non-sensitive concrete metrics that appear in the resume verbatim (e.g., "LCP 3.2s → 1.8s", "built 12 REST endpoints").
- Forbidden: Fabricated or implied metrics (e.g., "~30% improvement" when not in the resume).

TASKS:
1) scores.overall (0–100)
2) breakdown: structure/language/keywords/experience (each 0–100)
3) jobFit object with:
   - score (0–100): Direct match percentage between resume skills/keywords and job description
   - keywordMatch (0–100)
   - skillsAlignment (0–100)
   - benchmark (string): e.g., "Based on 850 similar profiles in Bangladesh"
4) interview.probability (%) + 1-line rationale + benchmark context
5) salary (for the given REGION): min, max, currency, confidence (0–100), region = "{{region}}"
   - Echo the provided desired salary into salary.desired (or null if not provided).
   - Set salary.position, salary.deltaToMedianPct, salary.recommendedAsk = null (server computes).
6) suggestions (3–6 baseline; may exceed to cover required terms): imperative one-liners; targetSection ∈ ["summary","experience","education","projects","skills","general","certifications","awards"]; priority 1–3.
   - If resumeSections.certifications is empty, include ≥1 suggestion with targetSection="certifications" (e.g., "Pursue AWS Certified Developer and add under Certifications").
   - If resumeSections.awards is empty, include ≥1 suggestion with targetSection="awards" (e.g., "Add Awards section if you have hackathon wins or academic honors").
   - Coverage rule: For EVERY term in optimization.keywordGaps[] AND premiumInsights.atsCoverage.missing[].term, include at least one suggestions[] item containing that exact term (case-insensitive), with a concrete targetSection. Idempotent: no exact-duplicate "text".
   - Top3 linkage: For EVERY item in premiumInsights.atsCoverage.top3Actions[], also create a corresponding suggestions[] entry (priority=1) with an inferred targetSection. Idempotent.
   - Summary wording guard:
     * If resumeSections.summary.content is null or empty → you MAY suggest "Add a Summary section ...".
     * Else (summary exists) → NEVER use "Add a summary section". Use "Refine your summary ..." phrasing and include exact missing terms as needed (e.g., 'RESTful APIs', 'Docker', 'TypeScript') for ATS alignment.
   - Do NOT include fabricated numeric claims in suggestions text.

7) optimization: certifications[], languages[], skills[], achievements[], keywordGaps[]
8) careerPaths (2–3): industry-aligned roles[] ladder + accelerators[]
9) trends (for REGION): direction ("up"|"down"|"flat"|"unknown"), note (1 line), monthlyGrowth (e.g., "+22%", "-5%", "stable")
10) marketInsights object with:
    - regionalDemand (string)
    - competitionLevel ("High"|"Medium"|"Low")
    - optimalTiming (string | null)
    - demandDrivers[]
11) premiumInsights (ALWAYS):
    - atsCoverage: { exactPct, partialPct, stemPct, missing[{term, weight 0–1}], top3Actions[string] }
      * Top 3 Actions (exactly 3):
        · premiumInsights.atsCoverage.top3Actions MUST contain EXACTLY three concise action strings.
        · Selection order (deterministic): (1) highest-weight items from atsCoverage.missing[].term (desc), (2) highest-severity from skillGaps (desc), (3) then most impactful quick-win from impact[] / lowest breakdown score.
        · These three are quick wins only; not exhaustive.
    - skillGaps: [{skill, severity 0–100}]
    - impact: [{section, score 0–100, evidence}]
    - compPercentile (0–100)
    - salaryPercentiles (REGION): p25, p50, p75, currency
    - trendDrilldown (REGION): sparkline[] (MoM%), risingSkills[]
    - certsAndCourses[] (concise)
    - recruiterPitch[] (3–5 bullets)
    - shortlist[]: [{title, requirements[]}]
    - redFlags[]

12) resumeSections (Always):
    - personalInfo, summary, experience[], education[], skills, projects[], 
      certifications[], awards[], publications[], volunteer[], additional
    - **STRICT TYPE RULES:**
      · additional.interests → array of strings
      · additional.hobbies → array of strings  
      · additional.references → **array of strings** (format: "Name - Position/Org", use [] if empty, NEVER string or null)
      · additional.other → array of strings
    - Extract only existing data; use [] for empty arrays, null for missing objects
    - Normalize text; parse dates consistently; keep current vs past roles

CONSISTENCY RULES (critical):
- Keyword Gaps → Suggestions coverage:
  * For EVERY term in optimization.keywordGaps[] AND premiumInsights.atsCoverage.missing[].term,
    produce AT LEAST ONE item in suggestions[] that includes the exact term (case-insensitive), uses imperative phrasing, and has a concrete targetSection.
- Skills Gaps echo:
  * improvements.skills.keywordGaps MUST exactly mirror optimization.keywordGaps (same strings/order if possible).
- Region & Persona echo:
  * If "{{region}}" is non-empty → salary.region MUST equal "{{region}}".
  * Else → INFER region from resume text (e.g., personalInfo.location) and use that in salary.region.
  * interview.benchmark MUST reference the effective region/persona.
- Top3 → Suggestions & Improvements (auto-apply, augment-only):
  * For EVERY string in premiumInsights.atsCoverage.top3Actions[]:
    - Ensure a matching item exists in suggestions[] (priority=1; inferred targetSection; idempotent).
    - ALSO apply a concrete, truthful change in the corresponding improvements.* section. This AUGMENTS existing improvements; do NOT remove or replace other improvements.
  * Section mapping (case-insensitive; prefer explicit section words in the action text; otherwise use heuristics):
    - "summary" or generic headline terms (e.g., "Full Stack"): ensure improvements.summary.after contains the exact term and append to improvements.summary.keywordsAdded (no duplicates).
    - "skills" or explicit skill terms (e.g., "RESTful APIs", "Docker", "TypeScript"): ensure improvements.skills.afterGrouped includes the exact term in a sensible group (Frontend/Backend/Databases/Tools/Languages/Core). Avoid duplicates; you may promote key terms via ordering or a "Core" group.
    - "experience" / "achievements" / "metrics": add at least one active-voice bullet under improvements.experience[most relevant].afterBullets mentioning the exact term. **Numeric-proofing applies strictly**.
    - "projects": update one relevant item in improvements.projects (afterDesc and/or tech[]) to include the exact term (avoid duplicates in tech[]).
    - "certifications"/"awards": if resumeSections.certifications/awards is empty → DO NOT fabricate entries; keep improvements.certifications/awards = []; still produce a suggestion and include an improvements.ops hint for the intended path.
- Section-aware wording:
  * Do not suggest "Add <section>" if that section already exists.
  * If summary exists and any suggestion text matches /Add (a )?summary section/i, rewrite to a "Refine your summary ..." variant.

CERTIFICATION NORMALIZATION & DE-DUP (STRICT):
- Parse certifications only from lines that explicitly include one of: ["certificate","certified","certification","license","licence","exam"] (case-insensitive).
- Group certifications by normalized name (trim, collapse spaces, case-insensitive).
- For each group (same certificate name):
  • issuer behaves like a SET (case-insensitive). Collect unique issuers across duplicates.
  • Represent issuer as:
      - null  → if no issuer
      - string → if exactly 1 unique issuer
      - array  → if ≥2 unique issuers (schema supports string | array | null)
  • Prefer first non-null among duplicates for: dateIssued, expiryDate, credentialId, url. Never fabricate.
- Do NOT create multiple objects for the same certificate name. Return ONE object per unique certificate.
- If an item looks like a technology/vendor without certificate cues (e.g., "Zend", "CodeIgniter", "Symfony" without “certificate/certified” wording), DEMOTE to skills (not certifications).
- Mirror rule:
  • resumeSections.certifications = normalized, de-duplicated list.
  • improvements.certifications = the SAME normalized list (may refine wording only).
  • Log consolidation under improvements.ops with op:"replace" at /improvements/certifications.
- Idempotency: no duplicate certificate objects; issuer sets have no duplicate strings.
- SCHEMA GUARD (fallback): If your schema does NOT allow arrays for issuer, join multiple issuers with " / " into a single string.

IMPROVEMENTS (must strictly align to resumeSections):
- Always populate resumeSections first. Improvements must reference exact indices/ids from resumeSections.
- summary: one rewritten paragraph (truthful, no invented facts). Numeric-proofing applies.
- experience[]: see structure; do NOT invent employers/dates/tools. Numeric-proofing applies.
- skills: { afterGrouped: { "<GroupName>": [skills...] }, keywordGaps[] } (keywordGaps must mirror optimization.keywordGaps exactly).
- projects[]: { name, afterDesc, impact, tech[], url } (numeric-proofing applies).
- education[]: minimal cleanup { degree, institution, graduationYear }.
- certifications[]: normalized, de-duplicated objects with keys { name, issuer, dateIssued, expiryDate, credentialId, url } per rules above.
- awards[]: similar structure or [] if none.
- sectionsOrder: ["summary","experience","skills","projects","education","certifications"].
- ops (patch trace; idempotent):
  * For every applied Top3 action, append a JSON-patch-like entry under improvements.ops with { "op": "add" | "replace" | "remove", "path": "/improvements/…", "value": <value> }.

OTHER RULES:
- If resumeSections.experience is null or empty, set improvements.experience = [].
- trendDrilldown.sparkline must be numbers (e.g., 2.0, -1.0), not strings with %.
- Salary: echo desired into salary.desired (integer or null). Ensure ISO 4217 currency codes.
- Keep salary.position, salary.deltaToMedianPct, salary.recommendedAsk = null.

OUTPUT CONTRACT:
- Return ONLY raw JSON that validates EXACTLY against the provided schema.
- CRITICAL JSON RULES:
  * All string values must be properly escaped (\") and no unescaped newlines/tabs (use \\n, \\t).
  * No trailing commas. Use standard ASCII quotes.
  * Unknown → null or [].

MISSING-SECTION RULES:
- If certifications = [], include ≥1 suggestion with targetSection = "certifications".
- If awards = [], include ≥1 suggestion with targetSection = "awards".

JSON_SCHEMA:
${schemaStr}`;

  userPrompt = userPrompt
    .replace(/\{\{messyText\}\}/g, messyText || "")
    .replace(/\{\{jdText\}\}/g, jdText || "")
    .replace(/\{\{region\}\}/g, region || "")
    .replace(/\{\{industry\}\}/g, industry || "null")
    .replace(/\{\{actor\}\}/g, actor || "")
    .replace(/\{\{persona\}\}/g, persona || "null")
    .replace(/\{\{desiredSalary\}\}/g, desiredSalary || "null")
    .replace(/\{\{industryJson\}\}/g, industryJsonStr)
    .replace(/\{\{personaJson\}\}/g, personaJsonStr)
    .replace(/\{\{desiredSalaryJson\}\}/g, desiredSalaryJsonStr);

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: userPrompt },
  ];
}

module.exports = { buildMessages };
