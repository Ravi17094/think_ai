const { z } = require("zod");
const id = z.coerce.number().int().positive();
const text = z.string().trim().min(1).max(500);
const language = z.enum(["python", "javascript", "java", "cpp"]);
const code = z.string().min(1).max(100000);
// The older Desktop LMS clients use snake_case; preserve the current camelCase contract too.
function executionAliases(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const normalized = { ...value };
  for (const [canonical, alias] of [["sourceCode", "source_code"], ["testCases", "test_cases"]]) {
    if (value[canonical] !== undefined && value[alias] !== undefined &&
        JSON.stringify(value[canonical]) !== JSON.stringify(value[alias])) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [canonical], message: `Conflicting ${canonical} and ${alias} values.` });
      return z.NEVER;
    }
    normalized[canonical] = value[canonical] ?? value[alias];
  }
  if (Array.isArray(normalized.testCases)) {
    normalized.testCases = normalized.testCases.map((test, index) => {
      if (!test || typeof test !== "object" || Array.isArray(test)) return test;
      if (test.expectedOutput !== undefined && test.expected_output !== undefined && test.expectedOutput !== test.expected_output) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["testCases", index, "expectedOutput"], message: "Conflicting expected-output values." });
      }
      return { ...test, expectedOutput: test.expectedOutput ?? test.expected_output };
    });
  }
  return normalized;
}
const course = z.object({
  title: text,
  description: z.string().max(20000),
  category: text,
  price: z.number().min(0),
  duration: text,
  thumbnail: z.string().url().optional().nullable(),
  instructorName: text.optional(),
  instructorDetails: z.string().max(5000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  completionThreshold: z.number().min(1).max(100).default(80),
});
const moduleSchema = z.object({
  title: text,
  description: z.string().max(5000).optional(),
  courseId: id,
  order: z.number().int().min(0),
});
const lesson = z.object({
  title: text,
  description: z.string().max(5000).optional(),
  content: z.string().max(100000).optional(),
  videoUrl: z.string().url().optional().nullable(),
  duration: text.optional(),
  durationSeconds: z.number().positive().max(86400),
  completionThreshold: z.number().min(1).max(100).default(90),
  videoBytes: z.number().int().positive().optional().nullable(),
  moduleId: id,
  order: z.number().int().min(0),
});
const answer = z.object({
  questionId: id,
  selectedOptionId: id.optional(),
  code: code.optional(),
  language: language.optional(),
  answerText: z.string().max(10000).optional(),
});
const progress = z.object({
  lessonId: id,
  enrollmentId: id,
  watchedSeconds: z.number().min(0).max(86400),
  updatedAt: z.string().datetime(),
  baseVersion: z.string().datetime().nullable(),
});
module.exports = {
  id,
  course,
  module: moduleSchema,
  lesson,
  language,
  assessmentRules: z.object({
    passPercentage: z.number().min(1).max(100).optional(),
    maxAttempts: z.number().int().min(1).max(100).optional(),
    duration: z.number().int().min(1).max(1440).optional(),
  }).strict().refine(value => Object.keys(value).length > 0, "Provide an assessment rule."),
  execute: z.preprocess(executionAliases, z.object({
    language,
    sourceCode: code,
    timeout: z.number().int().min(1).max(30).default(30),
    testCases: z
      .array(
        z.object({
          input: z.string().max(50000).default(""),
          expectedOutput: z.string().max(100000).optional(),
        }),
      )
      .min(1)
      .max(20)
      .default([{ input: "" }]),
  })),
  note: z.object({ text: z.string().max(20000) }),
  start: z.object({ enrollmentId: id }),
  submit: z.object({
    attemptId: id,
    answers: z.array(answer).max(200),
    flaggedQuestionIds: z.array(id).max(200).default([]),
    timestamp: z.string().datetime(),
  }),
  sync: z.object({ updates: z.array(progress).min(1).max(100) }),
  dates: z.object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    bucket: z.enum(["daily", "weekly", "monthly", "quarterly"]).default("daily"),
  }),
};
