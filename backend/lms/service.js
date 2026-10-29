const { check, LmsError } = require("./errors");
const { completion, gradeMcq } = require("./completion");
const courseTree = {
  modules: {
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: {
      lessons: { orderBy: [{ order: "asc" }, { id: "asc" }] },
      assessments: true,
    },
  },
};
const assessmentTree = {
  questions: {
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: { options: true, codingTestCases: true },
  },
  module: true,
};
const isStaff = (user) =>
  ["admin", "instructor", "superadmin"].includes(user.role.toLowerCase());
function createService({
  db,
  executor,
  certificates,
  emit = () => {},
  now = () => new Date(),
  env = process.env,
}) {
  async function enrollment(user, id, client = db) {
    const row = await client.enrollment.findUnique({
      where: { id },
      include: { batch: { include: { course: { include: courseTree } } } },
    });
    check(row, 404, "NOT_FOUND", "Enrollment not found.");
    check(
      isStaff(user) ||
        row.studentEmail.toLowerCase() === user.email.toLowerCase(),
      403,
      "FORBIDDEN",
      "This enrollment belongs to another learner.",
    );
    check(
      row.courseAccess &&
        ["ENROLLED", "ACTIVE", "COMPLETED"].includes(
          row.enrollmentStatus.toUpperCase(),
        ),
      403,
      "ACCESS_LOCKED",
      "Course access has not been unlocked.",
    );
    check(
      row.batch.status === "ACTIVE" && row.batch.course.status === "ACTIVE",
      403,
      "COURSE_INACTIVE",
      "Course or batch is inactive.",
    );
    return row;
  }
  async function ownedAttempt(user, id) {
    const row = await db.assessmentSubmission.findUnique({
      where: { id },
      include: { answers: true, assessment: { include: assessmentTree } },
    });
    check(row, 404, "NOT_FOUND", "Assessment attempt not found.");
    await enrollment(user, row.enrollmentId);
    return row;
  }
  async function summary(enrollmentId, course, client = db) {
    const [progress, submissions] = await Promise.all([
      client.lessonProgress.findMany({ where: { enrollmentId } }),
      client.assessmentSubmission.findMany({
        where: { enrollmentId, status: "GRADED" },
      }),
    ]);
    return completion(course, progress, submissions);
  }
  async function enrollments(user) {
    const rows = await db.enrollment.findMany({
      where: { studentEmail: { equals: user.email, mode: "insensitive" } },
      include: { batch: { include: { course: { include: courseTree } } } },
      orderBy: { enrolledAt: "desc" },
    });
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        summary: await summary(r.id, r.batch.course),
      })),
    );
  }
  async function player(user, courseId) {
    const rows = await db.enrollment.findMany({
      where: {
        studentEmail: { equals: user.email, mode: "insensitive" },
        batch: { courseId },
      },
      orderBy: { enrolledAt: "desc" },
    });
    const selected = rows.find(
      (r) =>
        r.courseAccess &&
        ["ENROLLED", "ACTIVE", "COMPLETED"].includes(
          r.enrollmentStatus.toUpperCase(),
        ),
    );
    check(
      selected,
      403,
      "NOT_ENROLLED",
      "An active, unlocked enrollment is required for this course.",
    );
    const row = await enrollment(user, selected.id);
    const progress = await db.lessonProgress.findMany({
      where: { enrollmentId: row.id },
    });
    return {
      enrollmentId: row.id,
      course: row.batch.course,
      progress,
      summary: await summary(row.id, row.batch.course),
    };
  }
  async function lessonAccess(user, enrollmentId, lessonId) {
    const row = await enrollment(user, enrollmentId);
    const lesson = row.batch.course.modules
      .flatMap((m) => m.lessons)
      .find((l) => l.id === lessonId);
    check(
      lesson,
      403,
      "WRONG_COURSE",
      "Lesson does not belong to this enrollment.",
    );
    return { row, lesson };
  }
  async function sync(user, updates) {
    const results = [];
    // Atomic compare-and-write with retry avoids offline races and duplicate completion rows.
    for (const update of updates) {
      const { lesson } = await lessonAccess(
        user,
        update.enrollmentId,
        update.lessonId,
      );
      check(
        lesson.durationSeconds > 0,
        409,
        "MISSING_DURATION",
        "Lesson durationSeconds must be configured by staff.",
      );
      check(
        Number.isFinite(lesson.completionThreshold) && lesson.completionThreshold > 0 && lesson.completionThreshold <= 100,
        409, "MISSING_COMPLETION_RULE", "Lesson completionThreshold must be configured by staff.",
      );
      let result;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          result = await db.$transaction(
            async (tx) => {
              const key = {
                enrollmentId: update.enrollmentId,
                lessonId: update.lessonId,
              };
              const previous = await tx.lessonProgress.findUnique({
                where: { enrollmentId_lessonId: key },
              });
              // A version mismatch always returns the canonical server state, regardless of device clock.
              const matches = previous
                ? update.baseVersion === previous.updatedAt.toISOString()
                : update.baseVersion === null;
              if (!matches)
                return {
                  lessonId: update.lessonId,
                  enrollmentId: update.enrollmentId,
                  conflict: true,
                  progress: previous,
                };
              const watchedSeconds = Math.min(
                update.watchedSeconds,
                lesson.durationSeconds,
              );
              const watchPercentage =
                Math.round((watchedSeconds / lesson.durationSeconds) * 10000) /
                100;
              const completed = previous?.completed || watchPercentage >= lesson.completionThreshold;
              const data = {
                watchedSeconds,
                totalDuration: lesson.durationSeconds,
                watchPercentage,
                completed,
                completedAt:
                  previous?.completedAt || (completed ? now() : null),
              };
              const progress = await tx.lessonProgress.upsert({
                where: { enrollmentId_lessonId: key },
                create: { ...key, ...data },
                update: data,
              });
              return {
                lessonId: update.lessonId,
                enrollmentId: update.enrollmentId,
                conflict: false,
                progress,
              };
            },
            { isolationLevel: "Serializable" },
          );
          break;
        } catch (error) {
          if (!["P2034", "P2002"].includes(error.code) || attempt === 2)
            throw error;
        }
      }
      results.push(result);
      await queueCertificateIfEligible(update.enrollmentId);
    }
    return results;
  }
  async function queueCertificateIfEligible(enrollmentId) {
    const row = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { batch: { include: { course: { include: courseTree } } } },
    });
    if (!row?.courseAccess) return;
    if (!(await summary(row.id, row.batch.course)).eligible) return;
    await db.lmsCertificateDelivery.upsert({
      where: { enrollmentId },
      create: { enrollmentId, status: "GENERATE" },
      update: {},
    });
  }
  async function note(user, enrollmentId, lessonId, text) {
    await lessonAccess(user, enrollmentId, lessonId);
    const where = { enrollmentId_lessonId: { enrollmentId, lessonId } };
    if (text === undefined)
      return (await db.lmsNote.findUnique({ where })) || { text: "" };
    return db.lmsNote.upsert({
      where,
      create: { enrollmentId, lessonId, text },
      update: { text },
    });
  }
  function safeAssessment(assessment) {
    return {
      ...assessment,
      questions: assessment.questions.map((q) => {
        const { codingTestCases, options, ...rest } = q;
        // Explanations, expected outputs and correct flags remain server-side until grading.
        delete rest.explanation;
        return {
          ...rest,
          options: options.map(({ isCorrect, ...option }) => option),
          examples: q.examples,
          codingTestCases: codingTestCases
            .filter((t) => !t.isHidden)
            .map((t) => ({ input: t.input, expectedOutput: t.expectedOutput })),
        };
      }),
    };
  }
  async function start(user, assessmentId, enrollmentId) {
    const enrolled = await enrollment(user, enrollmentId);
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: assessmentTree,
    });
    check(
      assessment && assessment.status === "ACTIVE",
      404,
      "NOT_FOUND",
      "Active assessment not found.",
    );
    check(
      assessment.module.courseId === enrolled.batch.courseId,
      403,
      "WRONG_COURSE",
      "Assessment does not belong to this course.",
    );
    check(
      assessment.questions.length > 0,
      409,
      "EMPTY_ASSESSMENT",
      "Assessment questions are not configured.",
    );
    check(
      assessment.questions.every(
        (q) =>
          q.questionType === "CODING" ||
          (q.questionType === "MCQ" &&
            q.options.filter((o) => o.isCorrect).length === 1),
      ),
      409,
      "INVALID_ASSESSMENT",
      "Only coding and single-choice questions with one correct answer are supported.",
    );
    const attempt = await db.$transaction(
      async (tx) => {
        const attempts = await tx.assessmentSubmission.findMany({
          where: { assessmentId, enrollmentId },
          orderBy: { id: "desc" },
        });
        const running = attempts.find(
          (a) =>
            a.status === "IN_PROGRESS" && a.expiresAt && a.expiresAt > now(),
        );
        if (running) return running;
        check(
          !attempts.some((a) => ["GRADING", "EVALUATING"].includes(a.status)),
          409,
          "GRADING_PENDING",
          "An earlier attempt is still grading.",
        );
        check(
          attempts.length < assessment.maxAttempts,
          409,
          "ATTEMPTS_EXHAUSTED",
          "Maximum assessment attempts reached.",
        );
        return tx.assessmentSubmission.create({
          data: {
            assessmentId,
            enrollmentId,
            totalMarks: assessment.questions.reduce((n, q) => n + q.marks, 0),
            status: "IN_PROGRESS",
            startedAt: now(),
            expiresAt: new Date(
              now().getTime() + (assessment.duration || 30) * 60000,
            ),
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      serverTime: now(),
      assessment: safeAssessment(assessment),
    };
  }
  async function submit(user, assessmentId, input) {
    const attempt = await ownedAttempt(user, input.attemptId);
    check(
      attempt.assessmentId === assessmentId,
      400,
      "WRONG_ASSESSMENT",
      "Attempt does not match the assessment.",
    );
    if (attempt.status !== "IN_PROGRESS")
      return { attemptId: attempt.id, status: attempt.status };
    // Client timestamp is informational; the server enforces the start/expiry window.
    check(
      attempt.expiresAt &&
        now().getTime() <= attempt.expiresAt.getTime() + 10000,
      409,
      "ASSESSMENT_EXPIRED",
      "Assessment time expired. Start a new attempt if allowed.",
    );
    const questions = attempt.assessment.questions;
    const ids = new Set(input.answers.map((a) => a.questionId));
    check(
      ids.size === input.answers.length &&
        input.answers.every((a) =>
          questions.some((q) => q.id === a.questionId),
        ),
      400,
      "INVALID_ANSWERS",
      "Answers contain duplicate or unknown question IDs.",
    );
    check(
      input.flaggedQuestionIds.every((id) =>
        questions.some((q) => q.id === id),
      ),
      400,
      "INVALID_FLAGS",
      "Flagged question does not belong to this assessment.",
    );
    for (const answer of input.answers) {
      const q = questions.find((q) => q.id === answer.questionId);
      if (q.questionType === "MCQ" && answer.selectedOptionId !== undefined)
        check(
          q.options.some((o) => o.id === answer.selectedOptionId),
          400,
          "INVALID_OPTION",
          "Option does not belong to the question.",
        );
      if (q.questionType === "CODING" && answer.code)
        check(
          answer.language &&
            (!Array.isArray(q.supportedLanguages) ||
              q.supportedLanguages.includes(answer.language)),
          400,
          "INVALID_LANGUAGE",
          "Choose a supported language.",
        );
    }
    await db.$transaction(async (tx) => {
      const claimed = await tx.assessmentSubmission.updateMany({
        where: { id: attempt.id, status: "IN_PROGRESS" },
        data: {
          status: "GRADING",
          submittedAt: now(),
          flaggedQuestionIds: input.flaggedQuestionIds,
        },
      });
      if (!claimed.count) return;
      await tx.submissionAnswer.createMany({
        data: questions.map((q) => {
          const answer = input.answers.find((a) => a.questionId === q.id);
          return {
            submissionId: attempt.id,
            questionId: q.id,
            selectedOptionId: answer?.selectedOptionId,
            code: answer?.code,
            language: answer?.language,
            ...(q.questionType === "MCQ"
              ? gradeMcq(q, answer)
              : { isCorrect: false, marksObtained: 0 }),
          };
        }),
      });
    });
    emit(user.id, "assessment:submitted", {
      attemptId: attempt.id,
      assessmentId,
      status: "GRADING",
    });
    return { attemptId: attempt.id, status: "GRADING" };
  }
  let workerBusy = false;
  async function gradePending() {
    if (workerBusy) return;
    workerBusy = true;
    try {
      // Recover a process crash after its lease expires. Retries replace scores; they do not add marks.
      await db.assessmentSubmission.updateMany({
        where: {
          status: "EVALUATING",
          gradingLeaseAt: { lt: new Date(now().getTime() - 120000) },
        },
        data: { status: "GRADING" },
      });
      const pending = await db.assessmentSubmission.findMany({
        where: { status: "GRADING" },
        take: 4,
        orderBy: { id: "asc" },
        include: { answers: true, assessment: { include: assessmentTree } },
      });
      await Promise.allSettled(
        pending.map(async (attempt) => {
          const claim = await db.assessmentSubmission.updateMany({
            where: { id: attempt.id, status: "GRADING" },
            data: { status: "EVALUATING", gradingLeaseAt: now() },
          });
          if (!claim.count) return;
          try {
            const deadline = Date.now() + 30000;
            for (const question of attempt.assessment.questions.filter(
              (q) => q.questionType === "CODING",
            )) {
              const answer = attempt.answers.find(
                (a) => a.questionId === question.id,
              );
              if (!answer?.code) continue;
              check(
                question.codingTestCases.length,
                409,
                "NO_TEST_CASES",
                "Coding question has no test cases.",
              );
              const remaining = Math.floor((deadline - Date.now()) / 1000);
              check(
                remaining >= 1,
                504,
                "EXECUTION_TIMEOUT",
                "Assessment grading exceeded 30 seconds.",
              );
              const execution = await executor.execute({
                language: answer.language,
                sourceCode: answer.code,
                timeout: remaining,
                testCases: question.codingTestCases.map((t) => ({
                  input: t.input || "",
                  expectedOutput: t.expectedOutput,
                })),
              });
              const total = question.codingTestCases.reduce(
                (n, t) => n + t.marks,
                0,
              );
              const passed = execution.results.reduce(
                (n, r, i) =>
                  n + (r.passed ? question.codingTestCases[i].marks : 0),
                0,
              );
              await db.submissionAnswer.update({
                where: { id: answer.id },
                data: {
                  isCorrect: passed === total,
                  marksObtained: total ? (question.marks * passed) / total : 0,
                },
              });
            }
            const answers = await db.submissionAnswer.findMany({
              where: { submissionId: attempt.id },
            });
            const score = answers.reduce(
              (n, a) => n + (a.marksObtained || 0),
              0,
            );
            await db.assessmentSubmission.update({
              where: { id: attempt.id },
              data: {
                status: "GRADED",
                score,
                percentage: attempt.totalMarks
                  ? (score / attempt.totalMarks) * 100
                  : 0,
                gradingError: null,
              },
            });
            await queueCertificateIfEligible(attempt.enrollmentId);
          } catch (error) {
            await db.assessmentSubmission.update({
              where: { id: attempt.id },
              data: {
                status: "FAILED",
                gradingError: error.code || "GRADING_FAILED",
              },
            });
          }
        }),
      );
      await db.lmsCertificateDelivery.updateMany({
        where: {
          status: "GENERATING",
          updatedAt: { lt: new Date(now().getTime() - 120000) },
        },
        data: { status: "GENERATE" },
      });
      const generationJobs = await db.lmsCertificateDelivery.findMany({
        where: { status: "GENERATE", nextAttemptAt: { lte: now() } },
        take: 5,
      });
      for (const job of generationJobs) {
        const claimedAt = now();
        const claimed = await db.lmsCertificateDelivery.updateMany({
          where: { id: job.id, status: "GENERATE" },
          data: { status: "GENERATING", updatedAt: claimedAt },
        });
        if (!claimed.count) continue;
        try {
          const row = await db.enrollment.findUnique({
            where: { id: job.enrollmentId },
            include: {
              batch: { include: { course: { include: courseTree } } },
            },
          });
          await certificates.issue(
            row,
            await summary(row.id, row.batch.course),
          );
          await db.lmsCertificateDelivery.updateMany({
            where: { id: job.id, status: "GENERATING", updatedAt: claimedAt },
            data: { status: certificates.isLocalMode?.() ? "LOCAL_READY" : "PENDING", lastError: null, attempts: 0 },
          });
        } catch (error) {
          await db.lmsCertificateDelivery.updateMany({
            where: { id: job.id, status: "GENERATING", updatedAt: claimedAt },
            data: {
              status: "GENERATE",
              lastError: error.message,
              nextAttemptAt: new Date(now().getTime() + 60000),
              attempts: { increment: 1 },
            },
          });
        }
      }
      await certificates.deliver();
    } finally {
      workerBusy = false;
    }
  }
  async function result(user, attemptId) {
    const attempt = await ownedAttempt(user, attemptId);
    if (!["GRADED", "FAILED"].includes(attempt.status))
      return { attemptId, status: attempt.status };
    const enrolled = await enrollment(user, attempt.enrollmentId);
    const attempts = await db.assessmentSubmission.count({
      where: {
        assessmentId: attempt.assessmentId,
        enrollmentId: attempt.enrollmentId,
      },
    });
    const certificate = await db.certificate.findUnique({
      where: { enrollmentId: attempt.enrollmentId },
    });
    return {
      attemptId,
      assessmentId: attempt.assessmentId,
      title: attempt.assessment.title,
      status: attempt.status,
      error: attempt.gradingError,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      passed:
        attempt.status === "GRADED" &&
        attempt.percentage >= attempt.assessment.passPercentage,
      canRetake: attempts < attempt.assessment.maxAttempts,
      enrollmentId: attempt.enrollmentId,
      certificateId: certificate?.id || null,
      certificateEligible: (await summary(enrolled.id, enrolled.batch.course))
        .eligible,
      questions: attempt.assessment.questions.map((q) => ({
        id: q.id,
        text: q.questionText,
        marks: q.marks,
        explanation: q.explanation,
        flagged:
          Array.isArray(attempt.flaggedQuestionIds) &&
          attempt.flaggedQuestionIds.includes(q.id),
        selectedAnswer:
          q.options.find(
            (o) =>
              o.id ===
              attempt.answers.find((a) => a.questionId === q.id)
                ?.selectedOptionId,
          )?.optionText ||
          attempt.answers.find((a) => a.questionId === q.id)?.code ||
          "Unanswered",
        correctAnswer:
          q.questionType === "CODING"
            ? "Evaluated against server test cases"
            : q.options
                .filter((o) => o.isCorrect)
                .map((o) => o.optionText)
                .join(", "),
        marksObtained:
          attempt.answers.find((a) => a.questionId === q.id)?.marksObtained ||
          0,
      })),
    };
  }
  async function certificate(user, id) {
    const cert = await db.certificate.findUnique({ where: { id } });
    check(cert, 404, "NOT_FOUND", "Certificate not found.");
    await enrollment(user, cert.enrollmentId);
    return { ...cert, pdfUrl: await certificates.downloadUrl(cert), storage: certificates.isLocalMode?.() ? "local" : "s3" };
  }
  async function localCertificateFile(id, token) {
    return certificates.readLocalPdf(id, token);
  }
  async function generateCertificate(user, enrollmentId) {
    const row = await enrollment(user, enrollmentId);
    return certificates.issue(row, await summary(row.id, row.batch.course));
  }
  async function profile(user) {
    const rows = await enrollments(user);
    const ids = rows.map((r) => r.id);
    const [certs, attempts, progress] = await Promise.all([
      db.certificate.findMany({
        where: { enrollmentId: { in: ids } },
        orderBy: { issuedAt: "desc" },
      }),
      db.assessmentSubmission.findMany({
        where: {
          enrollmentId: { in: ids },
          status: { in: ["GRADED", "FAILED"] },
        },
        orderBy: { submittedAt: "desc" },
        take: 10,
      }),
      db.lessonProgress.findMany({
        where: { enrollmentId: { in: ids } },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    const activity = [
      ...certs.map((c) => ({
        type: "certificate",
        text: `Certificate: ${c.courseName}`,
        at: c.issuedAt,
      })),
      ...attempts.map((a) => ({
        type: "assessment",
        text: `Assessment ${a.assessmentId}: ${a.status}`,
        at: a.submittedAt,
      })),
      ...progress.map((p) => ({
        type: "lesson",
        text: `Lesson ${p.lessonId}: ${p.completed ? "completed" : "in progress"}`,
        at: p.updatedAt,
      })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);
    return {
      user,
      stats: {
        coursesCompleted: rows.filter((r) => r.summary.eligible).length,
        certificatesEarned: certs.length,
        totalHours:
          Math.round(
            (progress.reduce((n, p) => n + p.watchedSeconds, 0) / 3600) * 10,
          ) / 10,
      },
      activity,
      certificates: certs,
    };
  }
  const analytics = require("./analytics").createAnalytics({ db, courseTree, now, env });

  return {
    enrollment,
    enrollments,
    player,
    lessonAccess,
    sync,
    note,
    start,
    submit,
    gradePending,
    result,
    certificate,
    localCertificateFile,
    generateCertificate,
    profile,
    analytics,
    summary,
  };
}
module.exports = { createService, courseTree, isStaff };
