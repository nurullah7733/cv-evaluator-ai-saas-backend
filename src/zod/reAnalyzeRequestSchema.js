const { z } = require("zod");

const SectionsZ = z
  .object({
    summary: z.string().optional(),
    experience: z.string().optional(),
    education: z.string().optional(),
    projects: z.string().optional(),
    skillsText: z.string().optional(),
  })
  .partial();

const ReanalyzeRequestZ = z
  .object({
    actor: z.enum(["candidate", "hiring_manager"]), // required
    persona: z
      .enum(["entry_level", "professional_level"])
      .nullable()
      .optional(), // candidate optional
    region: z.string().min(2), // required
    industry: z.string().nullable().optional(),
    jdText: z.string().min(10), // required
    desiredSalary: z.number().int().positive().nullable().optional(), // optional
    sections: SectionsZ.nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.actor === "hiring_manager" && v.persona) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "persona is candidate-only",
      });
    }
  });

module.exports = { ReanalyzeRequestZ };
