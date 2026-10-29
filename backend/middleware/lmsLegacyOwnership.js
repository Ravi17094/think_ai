const prisma = require("../config/database");

function reject(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}
function id(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    reject(400, "INVALID_ID", `${label} must be a positive integer.`);
  return parsed;
}
function guard(check) {
  return async (req, res, next) => {
    try {
      await check(req);
      next();
    } catch (error) {
      next(error);
    }
  };
}
async function ownedEnrollment(req, enrollmentId) {
  const user = req.lmsUser || req.user;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      studentEmail: true,
      courseAccess: true,
      enrollmentStatus: true,
      batch: {
        select: {
          courseId: true,
          status: true,
          course: { select: { status: true } },
        },
      },
    },
  });
  if (
    !user?.email ||
    !enrollment?.studentEmail ||
    enrollment.studentEmail.toLowerCase() !== user.email.toLowerCase()
  )
    reject(403, "ENROLLMENT_FORBIDDEN", "Enrollment is unavailable to this account.");
  if (
    !enrollment.courseAccess ||
    !["ACTIVE", "ENROLLED", "COMPLETED"].includes(enrollment.enrollmentStatus) ||
    enrollment.batch?.status !== "ACTIVE" ||
    enrollment.batch?.course?.status !== "ACTIVE"
  )
    reject(403, "COURSE_ACCESS_REQUIRED", "Active course access is required.");
  return enrollment;
}
async function relatedAssessment(enrollment, assessmentId) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, status: true, duration: true, module: { select: { courseId: true } } },
  });
  if (
    !assessment ||
    !Number.isSafeInteger(assessment.module?.courseId) ||
    assessment.module.courseId !== enrollment.batch.courseId
  )
    reject(403, "ASSESSMENT_FORBIDDEN", "Assessment is unavailable for this enrollment.");
  return assessment;
}
function writableAttempt(attempt, assessment) {
  if (!attempt || attempt.status !== "IN_PROGRESS")
    reject(409, "ATTEMPT_NOT_ACTIVE", "Start an active assessment attempt first.");
  if (assessment.status !== "ACTIVE")
    reject(403, "ASSESSMENT_INACTIVE", "Assessment is not active.");
  const deadline = attempt.expiresAt
    ? new Date(attempt.expiresAt).getTime()
    : Number(assessment.duration) > 0
      ? new Date(attempt.startedAt).getTime() + Number(assessment.duration) * 60000
      : null;
  if (deadline !== null && (!Number.isFinite(deadline) || Date.now() > deadline))
    reject(409, "ATTEMPT_EXPIRED", "Assessment attempt has expired.");
}
const requireOwnedEnrollment = guard(async (req) => {
  req.legacyEnrollment = await ownedEnrollment(req, id(req.params.enrollmentId, "Enrollment ID"));
});
function requireAssessmentEnrollment({ submitting = false } = {}) {
  return guard(async (req) => {
    const enrollmentId = id(req.body?.enrollmentId, "Enrollment ID");
    const assessmentId = id(req.params.id, "Assessment ID");
    const enrollment = await ownedEnrollment(req, enrollmentId);
    const assessment = await relatedAssessment(enrollment, assessmentId);
    if (assessment.status !== "ACTIVE")
      reject(403, "ASSESSMENT_INACTIVE", "Assessment is not active.");
    if (submitting) {
      const attempt = await prisma.assessmentSubmission.findFirst({
        where: { enrollmentId, assessmentId },
        orderBy: { createdAt: "desc" },
      });
      writableAttempt(attempt, assessment);
      for (const key of ["attemptId", "submissionId"])
        if (req.body[key] !== undefined && id(req.body[key], key) !== attempt.id)
          reject(403, "ATTEMPT_FORBIDDEN", "Attempt does not match this assessment enrollment.");
      req.legacyAttempt = attempt;
    }
    req.legacyEnrollment = enrollment;
  });
}
function requireOwnedCodeAttempt({ readOnly = false, publicTestCase = false } = {}) {
  return guard(async (req) => {
    const submissionId = id(req.params.submissionId ?? req.body?.submissionId, "Submission ID");
    const attempt = await prisma.assessmentSubmission.findUnique({ where: { id: submissionId } });
    if (!attempt) reject(403, "ATTEMPT_FORBIDDEN", "Attempt is unavailable to this account.");
    const enrollment = await ownedEnrollment(req, attempt.enrollmentId);
    const assessment = await relatedAssessment(enrollment, attempt.assessmentId);
    if (req.body?.enrollmentId !== undefined && id(req.body.enrollmentId, "Enrollment ID") !== enrollment.id)
      reject(403, "ATTEMPT_FORBIDDEN", "Attempt enrollment does not match.");
    if (!readOnly) {
      writableAttempt(attempt, assessment);
      const questionId = id(req.body?.questionId, "Question ID");
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { id: true, assessmentId: true, questionType: true },
      });
      if (!question || question.assessmentId !== assessment.id || question.questionType !== "CODING")
        reject(403, "QUESTION_FORBIDDEN", "Coding question does not belong to this attempt.");
      if (publicTestCase) {
        const testCase = await prisma.codingTestCase.findUnique({
          where: { id: id(req.body?.testCaseId, "Test Case ID") },
          select: { id: true, questionId: true, isHidden: true },
        });
        if (!testCase || testCase.questionId !== questionId || testCase.isHidden !== false)
          reject(403, "TEST_CASE_FORBIDDEN", "Only this question's public test cases may be run directly.");
      }
    }
    req.legacyAttempt = attempt;
  });
}

// Legacy controllers return ORM-shaped responses. Keep answer keys and hidden
// execution input/output out of learner responses, including future nested fields.
function learnerPayload(value) {
  if (Array.isArray(value)) return value.map(learnerPayload);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (["expectedOutput", "correctAnswer", "correctOptionId", "isCorrect", "codingTestCases", "explanation"].includes(key)) continue;
    if (value.isHidden === true && ["stdout", "stderr", "compileOutput", "actualOutput", "input", "stdin", "output"].includes(key)) continue;
    result[key] = learnerPayload(item);
  }
  return result;
}
function redactLearnerAnswers(req, res, next) {
  const json = res.json;
  res.json = function (payload) {
    return json.call(this, learnerPayload(payload));
  };
  next();
}
module.exports = {
  requireOwnedEnrollment,
  requireAssessmentEnrollment,
  requireOwnedCodeAttempt,
  redactLearnerAnswers,
};
