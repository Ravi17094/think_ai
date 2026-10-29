const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createService } = require("../service");
test("profile reconciles completed courses, certificates, hours and the ten newest activity records", async () => {
  const progress = Array.from({ length: 12 }, (_, index) => ({ lessonId: index + 1,
    enrollmentId: 1, completed: true, watchedSeconds: 300,
    updatedAt: new Date(Date.UTC(2026, 9, index + 1)) }));
  const certs = [{ id: 1, courseName: "Course", issuedAt: new Date("2026-10-20T00:00:00Z") }];
  const attempts = [{ assessmentId: 7, status: "GRADED", submittedAt: new Date("2026-10-19T00:00:00Z") }];
  const course = { completionThreshold: 80, modules: [{ lessons: progress.map(row => ({ id: row.lessonId })), assessments: [] }] };
  const db = {
    enrollment: { findMany: async () => [{ id: 1, batch: { course } }] },
    lessonProgress: { findMany: async () => progress },
    assessmentSubmission: { findMany: async () => attempts },
    certificate: { findMany: async () => certs },
  };
  const profile = await createService({ db, executor: {}, certificates: {} }).profile({ id: 1, email: "learner@example.invalid" });
  assert.deepEqual(profile.stats, { coursesCompleted: 1, certificatesEarned: 1, totalHours: 1 });
  assert.equal(profile.activity.length, 10);
  assert.equal(profile.activity[0].type, "certificate");
  assert.equal(profile.activity[1].type, "assessment");
  for (let index = 1; index < profile.activity.length; index++) assert.ok(profile.activity[index - 1].at >= profile.activity[index].at);
});
