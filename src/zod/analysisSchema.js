const { z } = require("zod");

// ---- helpers ----
const stringOrNull = z.string().nullable().optional();
const intOrNull = z.preprocess(
  (v) => (v === null ? null : Number(v)),
  z.number().int().nullable().optional()
);
const numOrNull = z.preprocess(
  (v) => (v === null ? null : Number(v)),
  z.number().nullable().optional()
);

// ---- leaf schemas ----
const ScoresZ = z
  .object({
    overall: z.number().int().min(0).max(100),
  })
  .passthrough();

const BreakdownZ = z
  .object({
    structure: z.number().int().min(0).max(100),
    language: z.number().int().min(0).max(100),
    keywords: z.number().int().min(0).max(100),
    experience: z.number().int().min(0).max(100),
  })
  .passthrough();

const JobFitZ = z
  .object({
    score: z.number().int().min(0).max(100),
    keywordMatch: z.number().int().min(0).max(100),
    skillsAlignment: z.number().int().min(0).max(100),
    benchmark: stringOrNull,
  })
  .passthrough();

const InterviewZ = z
  .object({
    probability: z.number().int().min(0).max(100),
    rationale: stringOrNull,
    benchmark: stringOrNull,
    confidence: z.number().min(0).max(1).nullable().default(null).optional(),
  })
  .passthrough();

const SalaryRecommendedAskZ = z
  .object({
    min: intOrNull,
    max: intOrNull,
  })
  .passthrough();

const SalaryRangeZ = z
  .object({
    min: intOrNull,
    max: intOrNull,
    currency: stringOrNull,
    confidence: z.number().int().min(0).max(100).nullable().optional(),
    region: z.string().optional(),
    desired: intOrNull,
    position: z
      .enum(["below_market", "near_median", "above_median", "premium"])
      .nullable()
      .optional(),
    deltaToMedianPct: numOrNull,
    recommendedAsk: SalaryRecommendedAskZ.nullable().optional(),
  })
  .passthrough();

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
  .passthrough();

const OptimizationZ = z
  .object({
    certifications: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
    achievements: z.array(z.string()).default([]),
    keywordGaps: z.array(z.string()).default([]),
  })
  .passthrough();

const CareerPathZ = z
  .object({
    industry: z.string().optional(),
    roles: z.array(z.string()).max(6).default([]),
    accelerators: z.array(z.string()).default([]),
  })
  .passthrough();

const TrendsZ = z
  .object({
    direction: z.enum(["up", "down", "flat", "unknown"]),
    note: stringOrNull,
    monthlyGrowth: stringOrNull,
  })
  .passthrough();

const MarketInsightsZ = z
  .object({
    regionalDemand: z.string().optional(),
    competitionLevel: z.enum(["High", "Medium", "Low"]),
    optimalTiming: stringOrNull,
    demandDrivers: z.array(z.string()).default([]),
  })
  .passthrough();

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
  .passthrough();

const SummaryZ = z
  .object({
    content: stringOrNull,
    experienceYears: z.number().int().nullable().optional(),
    keyPoints: z.array(z.string()).default([]),
  })
  .passthrough();

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
  .passthrough();

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
  .passthrough();

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
  .passthrough();

const ProjectItemZ = z
  .object({
    name: stringOrNull,
    description: stringOrNull,
    technologies: z.array(z.string()).default([]),
    url: stringOrNull,
    github: stringOrNull,
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    highlights: z.array(z.string()).default([]),
    keyFeatures: z.array(z.string()).default([]),
    impact: stringOrNull,
  })
  .passthrough();

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
  .passthrough();

const AwardItemZ = z
  .object({
    title: stringOrNull,
    issuer: stringOrNull,
    date: stringOrNull,
    description: stringOrNull,
  })
  .passthrough();

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
  .passthrough();

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
  .passthrough();

const AdditionalZ = z
  .object({
    interests: z.array(z.string()).default([]),
    hobbies: z.array(z.string()).default([]),
    references: z.array(z.string()).default([]),
    other: z.array(z.string()).default([]),
  })
  .passthrough();

// ---- meta ----
const ModelMetaZ = z
  .object({
    provider: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
  })
  .passthrough();

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
  .passthrough();

// ---- improvements ----
const ImprovementsExperienceItemZ = z
  .object({
    index: z.number().int().min(0).nullable().optional(),
    jobIndex: z.number().int().min(0).nullable().optional(),
    jobId: stringOrNull,
    company: z.string().nullable().optional(),
    beforeBullets: z.array(z.string()).default([]),
    afterBullets: z.array(z.string()).default([]),
    metricsAdded: z.array(z.string()).default([]),
    impactScore: z.number().min(0).max(100),
    afterTitle: stringOrNull,
    afterCompany: stringOrNull,
    afterPeriod: stringOrNull,
  })
  .passthrough();

const ImprovementsProjectItemZ = z
  .object({
    name: z.string().nullable().optional(),
    afterDesc: stringOrNull,
    impact: stringOrNull,
    tech: z.array(z.string()).default([]),
    url: stringOrNull,
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    highlights: z.array(z.string()).default([]).optional(),
  })
  .passthrough();

const ImprovementsSkillsZ = z
  .object({
    afterGrouped: z.record(z.array(z.string())).default({}).optional(),
    keywordGaps: z.array(z.string()).default([]),
  })
  .passthrough();

const ImprovementsEducationItemZ = z
  .object({
    degree: stringOrNull,
    institution: stringOrNull,
    graduationYear: stringOrNull,
  })
  .passthrough();

const ImprovementsCertItemZ = CertificationItemZ;
const ImprovementsAwardItemZ = z
  .object({
    title: stringOrNull,
    issuer: stringOrNull,
    date: stringOrNull,
  })
  .passthrough();

const ImprovementsOpZ = z
  .object({
    op: z.enum(["add", "replace", "remove"]),
    path: z.string().optional(),
    value: z.any().optional(),
  })
  .passthrough();

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
        after: z.string().optional(),
        why: stringOrNull,
        keywordsAdded: z.array(z.string()).default([]),
      })
      .passthrough(),
    experience: z.array(ImprovementsExperienceItemZ).default([]),
    skills: ImprovementsSkillsZ,
    projects: z.array(ImprovementsProjectItemZ).default([]),
    education: z.array(ImprovementsEducationItemZ).default([]),
    certifications: z.array(ImprovementsCertItemZ).default([]),
    awards: z.array(ImprovementsAwardItemZ).default([]),
    ops: z.array(ImprovementsOpZ).default([]),
  })
  .passthrough();

const ManagerViewZ = z
  .object({
    summary: stringOrNull,
    redFlags: z.array(z.string()).default([]),
    mustHaveCoverage: z.number().int().min(0).max(100).nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

// ---- premium insights ----
const PremiumInsightsZ = z
  .object({
    atsCoverage: z.object({
      exactPct: z.number().min(0).max(100).default(0),
      partialPct: z.number().min(0).max(100).default(0),
      stemPct: z.number().min(0).max(100).default(0),
      missing: z.array(
        z
          .object({ term: z.string(), weight: z.number().min(0).max(1) })
          .passthrough()
      ),
      top3Actions: z.array(z.string()).min(1).max(3).default([]),
    }),
    skillGaps: z.array(
      z.object({
        skill: z.string().optional(),
        severity: z.number().min(0).max(100).default(0),
      })
    ),
    impact: z.array(
      z.object({
        section: z.string().optional(),
        score: z.number().min(0).max(100).default(0),
        evidence: z.string().optional(),
      })
    ),
    compPercentile: z.number().min(0).max(100).optional(),
    salaryPercentiles: z
      .object({
        p25: z.number().default(0),
        p50: z.number().default(0),
        p75: z.number().default(0),
        currency: z.string().optional(),
      })
      .optional(),
    trendDrilldown: z.object({
      sparkline: z.array(z.number()).min(12).max(12).default([]),
      risingSkills: z.array(z.string()).default([]),
    }),
    certsAndCourses: z.array(z.string().default([])),
    recruiterPitch: z.array(z.string().default([])),
    shortlist: z
      .array(
        z.object({
          title: z.string().optional(),
          requirements: z.array(z.string()).default([]),
        })
      )
      .default([]),
    redFlags: z.array(z.string()).default([]).optional(),
  })
  .passthrough();

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
    scores: ScoresZ.optional(),
    breakdown: BreakdownZ.optional(),
    jobFit: JobFitZ.optional(),
    interview: InterviewZ.optional(),
    salary: SalaryRangeZ.optional(),
    suggestions: z.array(SuggestionZ).default([]),
    optimization: OptimizationZ.optional(),
    careerPaths: z.array(CareerPathZ).default([]),
    trends: TrendsZ.optional(),
    marketInsights: MarketInsightsZ.optional(),
    resumeSections: ResumeSectionsZ.optional(),
    premiumInsights: PremiumInsightsZ.optional(),
    improvements: ImprovementsZ.optional(),
    modelMeta: ModelMetaZ.optional(),
    managerView: ManagerViewZ.optional(),
  })
  .passthrough();

// sanitize wrapper
const analysisZ_sanitized = z.preprocess((val) => {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const { inputs, ...rest } = val;
    return {
      premiumInsights: { atsCoverage: {}, skillGaps: [], impact: [] },
      improvements: {},
      managerView: null,
      suggestions: [],
      ...rest,
    };
  }
  return val;
}, analysisZ);

// Export the sanitized version so everyone uses it
module.exports = { analysisZ: analysisZ_sanitized };
