const { z } = require("zod");

// ---- helpers ----
const stringOrNull = z.string().nullable().optional();
const intOrNull = z.number().int().nullable().optional();
const numOrNull = z.number().nullable().optional();

// ---- leaf schemas ----
const ScoresZ = z
  .object({
    overall: z.number().int().min(0).max(100),
  })
  .strict();

const BreakdownZ = z
  .object({
    structure: z.number().int().min(0).max(100),
    language: z.number().int().min(0).max(100),
    keywords: z.number().int().min(0).max(100),
    experience: z.number().int().min(0).max(100),
  })
  .strict();

const JobFitZ = z
  .object({
    score: z.number().int().min(0).max(100),
    keywordMatch: z.number().int().min(0).max(100),
    skillsAlignment: z.number().int().min(0).max(100),
    benchmark: stringOrNull,
  })
  .strict();

const InterviewZ = z
  .object({
    probability: z.number().int().min(0).max(100),
    rationale: stringOrNull,
    benchmark: stringOrNull,
    confidence: z.number().min(0).max(1).nullable().optional(),
  })
  .strict();

const SalaryRecommendedAskZ = z
  .object({
    min: intOrNull,
    max: intOrNull,
  })
  .strict();

const SalaryRangeZ = z
  .object({
    min: intOrNull,
    max: intOrNull,
    currency: stringOrNull,
    confidence: z.number().int().min(0).max(100).nullable().optional(),
    region: z.string(),
    desired: intOrNull,
    position: z
      .enum(["below_market", "near_median", "above_median", "premium"])
      .nullable()
      .optional(),
    deltaToMedianPct: numOrNull,
    recommendedAsk: SalaryRecommendedAskZ.nullable().optional(),
  })
  .strict();

const SuggestionZ = z
  .object({
    text: z.string(),
    targetSection: z.enum([
      "summary",
      "experience",
      "education",
      "projects",
      "skills",
      "general",
      "certifications",
      "awards",
    ]),
    priority: z.number().int().min(1).max(3),
  })
  .strict();

const OptimizationZ = z
  .object({
    certifications: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
    achievements: z.array(z.string()).default([]),
    keywordGaps: z.array(z.string()).default([]),
  })
  .strict();

const CareerPathZ = z
  .object({
    industry: z.string(),
    roles: z.array(z.string()).min(2).max(6),
    accelerators: z.array(z.string()).default([]),
  })
  .strict();

const TrendsZ = z
  .object({
    direction: z.enum(["up", "down", "flat", "unknown"]),
    note: stringOrNull,
    monthlyGrowth: stringOrNull,
  })
  .strict();

const MarketInsightsZ = z
  .object({
    regionalDemand: z.string(),
    competitionLevel: z.enum(["High", "Medium", "Low"]),
    optimalTiming: stringOrNull,
    demandDrivers: z.array(z.string()).default([]),
  })
  .strict();

// ---- resume sections ----
const PersonalInfoZ = z
  .object({
    fullName: stringOrNull,
    email: stringOrNull,
    phone: stringOrNull,
    location: stringOrNull,
    linkedin: stringOrNull,
    github: stringOrNull,
    portfolio: stringOrNull,
  })
  .strict();

const SummaryZ = z
  .object({
    content: stringOrNull,
    experienceYears: z.number().int().nullable().optional(),
    keyPoints: z.array(z.string()).default([]),
  })
  .strict();

const ExperienceItemZ = z
  .object({
    jobTitle: stringOrNull,
    company: stringOrNull,
    location: stringOrNull,
    duration: stringOrNull,
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    current: z.boolean().nullable().optional(),
    responsibilities: z.array(z.string()).default([]),
    achievements: z.array(z.string()).default([]),
  })
  .strict();

const EducationItemZ = z
  .object({
    degree: stringOrNull,
    institution: stringOrNull,
    location: stringOrNull,
    graduationYear: stringOrNull,
    gpa: stringOrNull,
    relevantCoursework: z.array(z.string()).default([]),
    honors: z.array(z.string()).default([]),
  })
  .strict();

const SkillsZ = z
  .object({
    technical: z.array(z.string()).default([]),
    programming: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    soft: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
  })
  .strict();

const ProjectItemZ = z
  .object({
    name: stringOrNull,
    description: stringOrNull,
    technologies: z.array(z.string()).default([]),
    url: stringOrNull,
    github: stringOrNull,
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    highlights: z.array(z.string()),
    keyFeatures: z.array(z.string()).default([]),
    impact: stringOrNull,
  })
  .strict();

const IssuerUnionZ = z
  .union([z.string(), z.array(z.string())])
  .nullable()
  .optional();

const CertificationItemZ = z
  .object({
    name: stringOrNull,
    issuer: IssuerUnionZ,
    dateIssued: stringOrNull,
    expiryDate: stringOrNull,
    credentialId: stringOrNull,
    url: stringOrNull,
  })
  .strict();

const AwardItemZ = z
  .object({
    title: stringOrNull,
    issuer: stringOrNull,
    date: stringOrNull,
    description: stringOrNull,
  })
  .strict();

const PublicationItemZ = z
  .object({
    title: stringOrNull,
    publisher: stringOrNull,
    date: stringOrNull,
    url: stringOrNull,
    description: stringOrNull,
    journal: stringOrNull,
    authors: z.array(z.string()).default([]),
  })
  .strict();

const VolunteerItemZ = z
  .object({
    organization: stringOrNull,
    role: stringOrNull,
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    description: stringOrNull,
    duration: stringOrNull,
    impact: stringOrNull,
  })
  .strict();

const AdditionalZ = z
  .object({
    interests: z.array(z.string()).default([]),
    hobbies: z.array(z.string()).default([]),
    references: z.array(z.string()).default([]),
    other: z.array(z.string()).default([]),
  })
  .strict();

// ---- meta ----
const ModelMetaZ = z
  .object({
    provider: z.string(),
    model: z.string(),
    promptVersion: z.string(),
  })
  .strict();

const ResumeSectionsZ = z
  .object({
    personalInfo: PersonalInfoZ.nullable(),
    summary: SummaryZ.nullable(),
    experience: z.preprocess(
      (v) => (v === null ? [] : v),
      z.array(ExperienceItemZ).default([])
    ),
    education: z.array(EducationItemZ).nullable().default([]),
    skills: SkillsZ.nullable(),
    projects: z.array(ProjectItemZ).nullable().default([]),
    certifications: z.array(CertificationItemZ).nullable().default([]),
    awards: z.array(AwardItemZ).nullable().default([]),
    publications: z.array(PublicationItemZ).nullable().default([]),
    volunteer: z.array(VolunteerItemZ).nullable().default([]),
    additional: AdditionalZ.nullable(),
  })
  .strict();

// ---- improvements ----
const ImprovementsExperienceItemZ = z
  .object({
    index: z.number().int().min(0).nullable().optional(),
    jobIndex: z.number().int().min(0).nullable().optional(),
    jobId: stringOrNull,
    company: z.string().nullable().optional(),
    beforeBullets: z.array(z.string()),
    afterBullets: z.array(z.string()),
    metricsAdded: z.array(z.string()),
    impactScore: z.number().min(0).max(100),
    afterTitle: stringOrNull,
    afterCompany: stringOrNull,
    afterPeriod: stringOrNull,
  })
  .strict();

const ImprovementsProjectItemZ = z
  .object({
    name: z.string().nullable().optional(),
    afterDesc: stringOrNull,
    impact: stringOrNull,
    tech: z.array(z.string()).default([]),
    url: stringOrNull,
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    highlights: z.array(z.string()).optional(),
  })
  .strict();

const ImprovementsSkillsZ = z
  .object({
    afterGrouped: z.record(z.array(z.string())).default({}).optional(),
    keywordGaps: z.array(z.string().optional()),
  })
  .strict();

const ImprovementsEducationItemZ = z
  .object({
    degree: stringOrNull,
    institution: stringOrNull,
    graduationYear: stringOrNull,
  })
  .strict();

const ImprovementsCertItemZ = CertificationItemZ;
const ImprovementsAwardItemZ = z
  .object({
    title: z.string(),
    issuer: stringOrNull,
    date: stringOrNull,
  })
  .strict();

const ImprovementsOpZ = z
  .object({
    op: z.enum(["add", "replace", "remove"]),
    path: z.string(),
    value: z.any().optional(),
  })
  .strict();

const ImprovementsZ = z
  .object({
    sectionsOrder: z.array(
      z.enum([
        "summary",
        "experience",
        "skills",
        "projects",
        "education",
        "certifications",
        "awards",
      ])
    ),
    summary: z
      .object({
        before: stringOrNull,
        after: z.string(),
        why: stringOrNull,
        keywordsAdded: z.array(z.string()).default([]),
      })
      .strict(),
    experience: z.array(ImprovementsExperienceItemZ).default([]),
    skills: ImprovementsSkillsZ,
    projects: z.array(ImprovementsProjectItemZ).default([]),
    education: z.array(ImprovementsEducationItemZ).default([]),
    certifications: z.array(ImprovementsCertItemZ).default([]),
    awards: z.array(ImprovementsAwardItemZ).default([]),
    ops: z.array(ImprovementsOpZ).default([]),
  })
  .strict();

const ManagerViewZ = z
  .object({
    summary: stringOrNull,
    redFlags: z.array(z.string()).default([]),
    mustHaveCoverage: z.number().int().min(0).max(100).nullable().optional(),
  })
  .strict()
  .nullable()
  .optional();

// ---- premium insights ----
const PremiumInsightsZ = z
  .object({
    atsCoverage: z.object({
      exactPct: z.number().min(0).max(100),
      partialPct: z.number().min(0).max(100),
      stemPct: z.number().min(0).max(100),
      missing: z.array(
        z
          .object({ term: z.string(), weight: z.number().min(0).max(1) })
          .strict()
      ),
      top3Actions: z.array(z.string()).min(1).max(3),
    }),
    skillGaps: z.array(
      z.object({ skill: z.string(), severity: z.number().min(0).max(100) })
    ),
    impact: z.array(
      z.object({
        section: z.string(),
        score: z.number().min(0).max(100),
        evidence: z.string(),
      })
    ),
    compPercentile: z.number().min(0).max(100).optional(),
    salaryPercentiles: z
      .object({
        p25: z.number(),
        p50: z.number(),
        p75: z.number(),
        currency: z.string(),
      })
      .optional(),
    trendDrilldown: z.object({
      sparkline: z.array(z.number()).min(12).max(12),
      risingSkills: z.array(z.string()),
    }),
    certsAndCourses: z.array(z.string().default([]).optional()),
    recruiterPitch: z.array(z.string().default([]).optional()),
    shortlist: z.array(
      z
        .object({
          title: z.string(),
          requirements: z.array(z.string()),
        })
        .default([])
        .optional()
    ),
    redFlags: z.array(z.string()).default([]).optional(),
  })
  .strict();

const analysisZ = z
  .object({
    actor: z.enum(["candidate", "hiring_manager"]),
    persona: z
      .enum(["entry_level", "professional_level"])
      .nullable()
      .optional(),
    industry: stringOrNull,
    jdText: stringOrNull,
    region: stringOrNull,
    desiredSalary: z.number().int().nullable().optional(),
    personaInferenceConfidence: z.number().min(0).max(1).nullable().optional(),
    scores: ScoresZ,
    breakdown: BreakdownZ,
    jobFit: JobFitZ,
    interview: InterviewZ,
    salary: SalaryRangeZ,
    suggestions: z.array(SuggestionZ),
    optimization: OptimizationZ,
    careerPaths: z.array(CareerPathZ),
    trends: TrendsZ,
    marketInsights: MarketInsightsZ,
    resumeSections: ResumeSectionsZ,
    premiumInsights: PremiumInsightsZ,
    improvements: ImprovementsZ,
    modelMeta: ModelMetaZ,
    managerView: ManagerViewZ,
  })
  .strict();

// sanitize wrapper: top-level `inputs` কে কেটে ফেলে strict `analysisZ` এ পাঠাও
const analysisZ_sanitized = z.preprocess((val) => {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const { inputs, ...rest } = val; // eslint-disable-line no-unused-vars
    return rest; // inputs drop
  }
  return val;
}, analysisZ);

// Export the sanitized version so everyone uses it
module.exports = { analysisZ: analysisZ_sanitized };
