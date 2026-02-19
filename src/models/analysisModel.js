const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

// --- helpers ---
const isStringArray = (v) =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const issuerValidator = (v) =>
  v == null || typeof v === "string" || isStringArray(v);

const StringOrNull = { type: String, default: null };
const IntOrNull = { type: Number, default: null };
const NumOrNull = { type: Number, default: null };

// --- leaf schemas ---
const ScoresSchema = new Schema(
  {
    overall: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false }
);

const BreakdownSchema = new Schema(
  {
    structure: { type: Number, min: 0, max: 100, required: true, default: 0 },
    language: { type: Number, min: 0, max: 100, required: true, default: 0 },
    keywords: { type: Number, min: 0, max: 100, required: true, default: 0 },
    experience: { type: Number, min: 0, max: 100, required: true, default: 0 },
  },
  { _id: false }
);

const JobFitSchema = new Schema(
  {
    score: { type: Number, min: 0, max: 100, required: true, default: 0 },
    keywordMatch: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      default: 0,
    },
    skillsAlignment: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      default: 0,
    },
    benchmark: StringOrNull,
  },
  { _id: false }
);

const InterviewSchema = new Schema(
  {
    probability: { type: Number, min: 0, max: 100, required: true, default: 0 },
    rationale: StringOrNull,
    benchmark: StringOrNull,
    confidence: { type: Number, min: 0, max: 1, default: null },
  },
  { _id: false }
);

const SalaryRecommendedAskSchema = new Schema(
  {
    min: IntOrNull,
    max: IntOrNull,
  },
  { _id: false }
);

const SalarySchema = new Schema(
  {
    min: IntOrNull,
    max: IntOrNull,
    currency: StringOrNull,
    confidence: { type: Number, min: 0, max: 100, default: null },
    region: { type: String, default: null },
    desired: IntOrNull,
    position: {
      type: String,
      enum: ["below_market", "near_median", "above_median", "premium", null],
      default: null,
    },
    deltaToMedianPct: NumOrNull,
    recommendedAsk: { type: SalaryRecommendedAskSchema, default: null },
  },
  { _id: false }
);

const SuggestionSchema = new Schema(
  {
    text: { type: String, required: false, default: null },
    targetSection: {
      type: String,
      enum: [
        "summary",
        "experience",
        "education",
        "projects",
        "skills",
        "general",
        "certifications",
        "awards",
      ],
      required: true,
    },
    priority: { type: Number, min: 1, max: 3, required: true, default: 1 },
  },
  { _id: false }
);

const OptimizationSchema = new Schema(
  {
    certifications: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    keywordGaps: { type: [String], default: [] },
  },
  { _id: false }
);

const CareerPathSchema = new Schema(
  {
    industry: { type: String, required: false, default: null },
    roles: {
      type: [String],
      default: [],
    },
    accelerators: { type: [String], default: [] },
  },
  { _id: false }
);

const TrendsSchema = new Schema(
  {
    direction: {
      type: String,
      enum: ["up", "down", "flat", "unknown"],
      required: true,
      default: "up",
    },
    note: StringOrNull,
    monthlyGrowth: StringOrNull,
  },
  { _id: false }
);

const MarketInsightsSchema = new Schema(
  {
    regionalDemand: { type: String, required: false, default: null },
    competitionLevel: {
      type: String,
      enum: ["High", "Medium", "Low"],
      required: true,
      default: "High",
    },
    optimalTiming: StringOrNull,
    demandDrivers: { type: [String], default: [] },
  },
  { _id: false }
);

// --- resume sections ---
const PersonalInfoSchema = new Schema(
  {
    fullName: StringOrNull,
    email: StringOrNull,
    phone: StringOrNull,
    location: StringOrNull,
    linkedin: StringOrNull,
    github: StringOrNull,
    portfolio: StringOrNull,
  },
  { _id: false }
);

const SummarySchema = new Schema(
  {
    content: StringOrNull,
    experienceYears: { type: Number, default: null },
    keyPoints: { type: [String], default: [] },
  },
  { _id: false }
);

const ExperienceItemSchema = new Schema(
  {
    jobTitle: StringOrNull,
    company: StringOrNull,
    location: StringOrNull,
    duration: StringOrNull,
    startDate: StringOrNull,
    endDate: StringOrNull,
    current: { type: Boolean, default: null },
    responsibilities: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
  },
  { _id: false }
);

const EducationItemSchema = new Schema(
  {
    degree: StringOrNull,
    institution: StringOrNull,
    location: StringOrNull,
    graduationYear: StringOrNull,
    gpa: StringOrNull,
    relevantCoursework: { type: [String], default: [] },
    honors: { type: [String], default: [] },
  },
  { _id: false }
);

const SkillsSchema = new Schema(
  {
    technical: { type: [String], default: [] },
    programming: { type: [String], default: [] },
    frameworks: { type: [String], default: [] },
    databases: { type: [String], default: [] },
    tools: { type: [String], default: [] },
    soft: { type: [String], default: [] },
    languages: { type: [String], default: [] },
  },
  { _id: false }
);

const ProjectItemSchema = new Schema(
  {
    name: StringOrNull,
    description: StringOrNull,
    technologies: { type: [String], default: [] },
    duration: StringOrNull,
    url: StringOrNull,
    github: StringOrNull,
    keyFeatures: { type: [String], default: [] },
    impact: StringOrNull,
  },
  { _id: false }
);

const CertificationItemSchema = new Schema(
  {
    name: StringOrNull,
    issuer: {
      type: Schema.Types.Mixed, // string | string[] | null
      validate: {
        validator: issuerValidator,
        message: "issuer must be string, string[] or null",
      },
      default: null,
    },
    dateIssued: StringOrNull,
    expiryDate: StringOrNull,
    credentialId: StringOrNull,
    url: StringOrNull,
  },
  { _id: false }
);

const AwardItemSchema = new Schema(
  {
    title: StringOrNull,
    issuer: StringOrNull,
    date: StringOrNull,
    description: StringOrNull,
  },
  { _id: false }
);

const PublicationItemSchema = new Schema(
  {
    title: StringOrNull,
    journal: StringOrNull,
    date: StringOrNull,
    url: StringOrNull,
    authors: { type: [String], default: [] },
  },
  { _id: false }
);

const VolunteerItemSchema = new Schema(
  {
    organization: StringOrNull,
    role: StringOrNull,
    duration: StringOrNull,
    description: StringOrNull,
    impact: StringOrNull,
  },
  { _id: false }
);

const AdditionalSchema = new Schema(
  {
    interests: { type: [String], default: [] },
    hobbies: { type: [String], default: [] },
    references: { type: [String], default: [] },
    other: { type: [String], default: [] },
  },
  { _id: false }
);

const ResumeSectionsSchema = new Schema(
  {
    personalInfo: { type: PersonalInfoSchema, default: null },
    summary: { type: SummarySchema, default: null },
    experience: { type: [ExperienceItemSchema], default: [] },
    education: { type: [EducationItemSchema], default: [] },
    skills: { type: SkillsSchema, default: null },
    projects: { type: [ProjectItemSchema], default: [] },
    certifications: { type: [CertificationItemSchema], default: [] },
    awards: { type: [AwardItemSchema], default: [] },
    publications: { type: [PublicationItemSchema], default: [] },
    volunteer: { type: [VolunteerItemSchema], default: [] },
    additional: { type: AdditionalSchema, default: null },
  },
  { _id: false }
);

// --- premium insights ---
const ATSMissingItemSchema = new Schema(
  {
    term: { type: String, required: false, default: null },
    weight: { type: Number, min: 0, max: 1, required: true, default: 0 },
  },
  { _id: false }
);

const ATSCoverageSchema = new Schema(
  {
    exactPct: { type: Number, min: 0, max: 100, required: true, default: 0 },
    partialPct: { type: Number, min: 0, max: 100, required: true, default: 0 },
    stemPct: { type: Number, min: 0, max: 100, required: true, default: 0 },
    missing: { type: [ATSMissingItemSchema], default: [] },
    top3Actions: {
      type: [String],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && arr.length >= 1 && arr.length <= 3,
        message: "top3Actions must have 1–3 items",
      },
      required: true,
      default: [],
    },
  },
  { _id: false }
);

const SkillGapSchema = new Schema(
  {
    skill: { type: String, required: false, default: null },
    severity: { type: Number, min: 0, max: 100, required: true, default: 0 },
  },
  { _id: false }
);

const ImpactItemSchema = new Schema(
  {
    section: { type: String, required: false, default: null },
    score: { type: Number, min: 0, max: 100, required: false, default: 0 },
    evidence: { type: String, required: false, default: null },
  },
  { _id: false }
);

const SalaryPercentilesSchema = new Schema(
  {
    p25: { type: Number, required: true, default: 0 },
    p50: { type: Number, required: true, default: 0 },
    p75: { type: Number, required: true, default: 0 },
    currency: { type: String, required: false, default: null },
  },
  { _id: false }
);

const TrendDrilldownSchema = new Schema(
  {
    sparkline: {
      type: [Number],
      default: [],
    },
    risingSkills: { type: [String], default: [] },
  },
  { _id: false }
);

const ShortlistItemSchema = new Schema(
  {
    title: { type: String, required: false, default: null },
    requirements: { type: [String], required: false, default: [] },
  },
  { _id: false }
);

const ManagerViewSchema = new Schema(
  {
    summary: StringOrNull,
    redFlags: { type: [String], default: [] },
    mustHaveCoverage: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const PremiumInsightsSchema = new Schema(
  {
    atsCoverage: { type: ATSCoverageSchema, required: false, default: {} },
    skillGaps: { type: [SkillGapSchema], default: [] },
    impact: { type: [ImpactItemSchema], default: [] },
    compPercentile: { type: Number, min: 0, max: 100, default: undefined },
    salaryPercentiles: { type: SalaryPercentilesSchema, default: undefined },
    trendDrilldown: {
      type: TrendDrilldownSchema,
      required: false,
      default: undefined,
    },
    certsAndCourses: { type: [String], default: [] },
    recruiterPitch: { type: [String], default: [] },
    shortlist: { type: [ShortlistItemSchema], default: [] },
    redFlags: { type: [String], default: [] },
  },
  { _id: false }
);

// --- improvements ---
const ImprovementsExperienceItemSchema = new Schema(
  {
    jobIndex: { type: Number, min: 0 },
    company: StringOrNull,
    jobId: StringOrNull,
    afterTitle: StringOrNull,
    afterCompany: StringOrNull,
    afterPeriod: StringOrNull,
    afterBullets: { type: [String], required: true, default: [] },
  },
  { _id: false }
);

const ImprovementsSkillsSchema = new Schema(
  {
    afterGrouped: {
      type: Map,
      of: [String],
      default: () => ({}),
      required: false,
    },
    keywordGaps: {
      type: [String],
      default: [],
      required: false,
    },
  },
  { _id: false }
);

const ImprovementsProjectItemSchema = new Schema(
  {
    name: { type: String, required: false },
    afterDesc: StringOrNull,
    impact: StringOrNull,
    tech: { type: [String], default: [] },
    url: StringOrNull,
  },
  { _id: false }
);

const ImprovementsEducationItemSchema = new Schema(
  {
    degree: { type: String },
    institution: StringOrNull,
    graduationYear: StringOrNull,
  },
  { _id: false }
);

const ImprovementsCertItemSchema = new Schema(
  {
    name: { type: String },
    issuer: {
      type: Schema.Types.Mixed,
      validate: {
        validator: issuerValidator,
        message: "issuer must be string, string[] or null",
      },
      default: null,
    },
    dateIssued: StringOrNull,
    expiryDate: StringOrNull,
    credentialId: StringOrNull,
    url: StringOrNull,
  },
  { _id: false }
);

const ImprovementsAwardItemSchema = new Schema(
  {
    title: { type: String, required: false },
    issuer: StringOrNull,
    date: StringOrNull,
  },
  { _id: false }
);

const ImprovementsOpSchema = new Schema(
  {
    op: { type: String, enum: ["add", "replace", "remove"], required: false },
    path: { type: String, required: false },
    value: { type: Schema.Types.Mixed, default: undefined },
  },
  { _id: false }
);

const ImprovementsSchema = new Schema(
  {
    sectionsOrder: {
      type: [String],
      enum: [
        "summary",
        "experience",
        "skills",
        "projects",
        "education",
        "certifications",
        "awards",
      ],
      required: true,
      default: [],
    },
    summary: {
      type: new Schema(
        {
          after: StringOrNull, // required by output schema but nullable
          why: StringOrNull,
          keywordsAdded: { type: [String], default: [] },
        },
        { _id: false }
      ),
      required: false,
    },
    experience: { type: [ImprovementsExperienceItemSchema], default: [] },
    skills: { type: ImprovementsSkillsSchema, required: false },
    projects: { type: [ImprovementsProjectItemSchema], default: [] },
    education: { type: [ImprovementsEducationItemSchema], default: [] },
    certifications: { type: [ImprovementsCertItemSchema], default: [] },
    awards: { type: [ImprovementsAwardItemSchema], default: [] },
    ops: { type: [ImprovementsOpSchema], default: [] },
  },
  { _id: false }
);

// --- model meta ---
const ModelMetaSchema = new Schema(
  {
    provider: { type: String, required: false },
    model: { type: String, required: false },
    promptVersion: { type: String, required: false },
  },
  { _id: false }
);

// --- top-level Analysis ---
const AnalysisSchema = new Schema(
  {
    filename: StringOrNull, // added filename for reference for identify reanalysis docs
    resumeId: { type: Types.ObjectId },
    version: { type: Number, default: 1 },
    previousAnalysisId: {
      type: Types.ObjectId,
      ref: "analyses",
      default: null,
    },
    isLatest: { type: Boolean, default: true },
    provider: StringOrNull,
    actor: {
      type: String,
      enum: ["hiring_manager", "candidate"],
      required: true,
      default: "candidate",
    },
    persona: {
      type: String,
      enum: ["entry_level", "professional_level", null],
      default: null,
    },
    industry: StringOrNull,
    jdText: StringOrNull,
    region: StringOrNull, // lowercase as per your schema
    desiredSalary: IntOrNull,
    personaInferenceConfidence: { type: Number, min: 0, max: 1, default: null },

    scores: { type: ScoresSchema },
    breakdown: { type: BreakdownSchema },
    jobFit: { type: JobFitSchema },
    interview: { type: InterviewSchema },
    salary: { type: SalarySchema },

    suggestions: { type: [SuggestionSchema], default: [] },
    optimization: { type: OptimizationSchema },
    careerPaths: { type: [CareerPathSchema], default: [] },
    trends: { type: TrendsSchema },
    marketInsights: { type: MarketInsightsSchema },
    resumeSections: { type: ResumeSectionsSchema },

    premiumInsights: { type: PremiumInsightsSchema },

    // Top-level managerView (your current Zod still includes it)
    // If you want ONLY nested version, delete the next line.
    managerView: { type: ManagerViewSchema, default: null },

    improvements: { type: ImprovementsSchema },

    modelMeta: { type: ModelMetaSchema },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true, // reject unknown keys at Mongo level too
  }
);

// Useful indexes (optional)
AnalysisSchema.index({ createdAt: -1 });
AnalysisSchema.index({ "modelMeta.promptVersion": 1 });
AnalysisSchema.index({ region: 1, industry: 1 });
AnalysisSchema.index({ "salary.region": 1 });
AnalysisSchema.index({ resumeId: 1 });

// Normalize issuer: if string, keep as string; if array, keep array; else null
// (Optional) you can add setters if you want to always coerce to array:
// CertificationItemSchema.path("issuer").set(v => (typeof v === "string" ? [v] : v));

const AnalysisModel = mongoose.model("analyses", AnalysisSchema);
module.exports = AnalysisModel;
