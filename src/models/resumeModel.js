const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const ResumeSchema = new Schema(
  {
    clerkUserId: { type: String },
    latestAnalysisId: { type: Types.ObjectId, default: null },

    provider: { type: String },

    analysisHistory: [{ type: Types.ObjectId, default: null }],
    // File meta
    filename: { type: String, default: null, trim: true },
    originalFilename: { type: String, default: null, trim: true },
    fileUrl: { type: String, default: null, trim: true },
    fileType: { type: String, default: null, trim: true },
    size: { type: Number, default: null, min: 0 },

    resumeSections: {
      clnRawText: { type: String, default: null },
      personalInfo: {
        fullName: { type: String, default: null, trim: true },
        email: { type: String, default: null, trim: true },
        phone: { type: String, default: null, trim: true },
        location: { type: String, default: null, trim: true },
        linkedin: { type: String, default: null, trim: true },
        github: { type: String, default: null, trim: true },
        portfolio: { type: String, default: null, trim: true },
      },

      summary: {
        content: { type: String, default: null },
        experienceYears: { type: Number, default: null }, // JSON had this field
        keyPoints: { type: [String], default: [] },
      },

      experience: [
        {
          jobTitle: { type: String, default: null },
          company: { type: String, default: null },
          location: { type: String, default: null },
          duration: { type: String, default: null },
          startDate: { type: String, default: null },
          endDate: { type: String, default: null },
          current: { type: Boolean, default: false },
          responsibilities: { type: [String], default: [] },
          achievements: { type: [String], default: [] },
          _id: false,
        },
      ],

      education: [
        {
          degree: { type: String, default: null },
          institution: { type: String, default: null },
          location: { type: String, default: null },
          graduationYear: { type: String, default: null },
          gpa: { type: String, default: null },
          relevantCoursework: { type: [String], default: [] },
          honors: { type: [String], default: [] },
          _id: false,
        },
      ],

      skills: {
        technical: { type: [String], default: [] },
        programming: { type: [String], default: [] },
        frameworks: { type: [String], default: [] },
        databases: { type: [String], default: [] },
        tools: { type: [String], default: [] },
        soft: { type: [String], default: [] },
        languages: { type: [String], default: [] },
      },

      projects: [
        {
          name: { type: String, default: null },
          description: { type: String, default: null },
          technologies: { type: [String], default: [] },
          duration: { type: String, default: null },
          url: { type: String, default: null },
          github: { type: String, default: null },
          keyFeatures: { type: [String], default: [] },
          impact: { type: String, default: null },
          _id: false,
        },
      ],

      certifications: [
        {
          name: { type: String, default: null },
          issuer: {
            type: Schema.Types.Mixed,
            default: null,
            validate: {
              validator: (v) =>
                v == null || typeof v === "string" || Array.isArray(v),
              message: "issuer must be string, string[] or null",
            },
          },
          dateIssued: { type: String, default: null },
          expiryDate: { type: String, default: null },
          credentialId: { type: String, default: null },
          url: { type: String, default: null },
          _id: false,
        },
      ],

      awards: [
        {
          title: { type: String, default: null },
          issuer: { type: String, default: null },
          date: { type: String, default: null },
          description: { type: String, default: null },
          _id: false,
        },
      ],

      publications: [
        {
          title: { type: String, default: null },
          journal: { type: String, default: null },
          date: { type: String, default: null },
          url: { type: String, default: null },
          authors: { type: [String], default: [] },
          _id: false,
        },
      ],

      volunteer: [
        {
          organization: { type: String, default: null },
          role: { type: String, default: null },
          duration: { type: String, default: null },
          description: { type: String, default: null },
          impact: { type: String, default: null },
          _id: false,
        },
      ],

      additional: {
        interests: { type: [String], default: [] },
        hobbies: { type: [String], default: [] },
        references: { type: [String], default: [] },
        other: { type: [String], default: [] },
      },
    },

    target: {
      actor: {
        type: String,
        enum: ["candidate", "hiring_manager", null],
        default: "candidate",
      },
      region: { type: String, default: null },
      lastJdText: { type: String, default: null },
      industry: { type: String, default: null },
      persona: {
        type: String,
        enum: ["entry_level", "professional_level", null],
        default: "entry_level",
      },
      lastDesiredSalary: { type: Number, default: null },
    },
  },
  { timestamps: true, versionKey: false, strict: true }
);

// Useful indexes for querying
ResumeSchema.index({ clerkUserId: 1, createdAt: -1 });
ResumeSchema.index({ clerkUserId: 1, filename: 1 });
ResumeSchema.index({ "resumeSections.personalInfo.fullName": 1 });

const ResumeModel = mongoose.model("resumes", ResumeSchema);
module.exports = ResumeModel;
