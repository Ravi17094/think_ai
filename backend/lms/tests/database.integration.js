// Run only against an empty, dedicated test database: LMS_TEST_DATABASE_URL.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { S3Client } = require("@aws-sdk/client-s3");
const { createRouter, canonicalAliases, errorHandler } = require("../router");
const { createService } = require("../service");
const { createCertificates } = require("../certificates");
const enabled = !!process.env.LMS_TEST_DATABASE_URL;
test(
  "PostgreSQL learner journey, access control, grading, certificate delivery, progress conflicts, analytics and CRUD",
  { skip: !enabled },
  async (t) => {
    const db = new PrismaClient({
      datasourceUrl: process.env.LMS_TEST_DATABASE_URL,
    });
    const prefix = `patan-test-${Date.now()}`;
    const users = [];
    let courseId, foreignCourseId;
    const env = {
      ACCESS_TOKEN_SECRET: "integration-only-not-for-deployment",
      AWS_REGION: "ap-south-1",
      LMS_CERTIFICATE_BUCKET: "test-certificates",
      SENDGRID_API_KEY: "test-only",
      FROM_EMAIL: "test@example.invalid",
      LMS_APP_URL: "https://example.invalid",
    };
    const s3 = new S3Client({
      region: env.AWS_REGION,
      credentials: { accessKeyId: "test-only", secretAccessKey: "test-only" },
    });
    const uploads = [],
      emails = [],
      events = [];
    s3.send = async (command) => {
      uploads.push(command.input);
      return {};
    };
    const certificates = createCertificates({
      db,
      env,
      s3,
      sendEmail: async (message) => emails.push(message),
    });
    const executor = {
      execute: async () => ({
        results: [{ passed: true, statusId: 3, stdout: "42" }],
      }),
    };
    const service = createService({
      db,
      executor,
      certificates,
      emit: (...args) => events.push(args),
    });
    const app = express();
    app.use(express.json());
    const router = createRouter({ db, service, executor, env });
    app.use("/api/lms", router);
    app.use("/api", canonicalAliases(router));
    // Use real route/middleware + this suite's isolated database, never the dev database.
    const databaseModule = require.resolve("../../config/database");
    const originalDatabaseModule = require.cache[databaseModule];
    const originalSecret = process.env.ACCESS_TOKEN_SECRET;
    process.env.ACCESS_TOKEN_SECRET = env.ACCESS_TOKEN_SECRET;
    require.cache[databaseModule] = { id: databaseModule, filename: databaseModule, loaded: true, exports: db };
    app.use("/api/enrollments", require("../../routes/enrollmentRoutes"));
    app.use(errorHandler);
    let admin,
      learner,
      other,
      token,
      adminToken,
      otherToken,
      enrollmentId,
      lessonId,
      assessmentId,
      questionId,
      optionId;
    try {
      for (const [name, role] of [
        ["Admin", "Admin"],
        ["Patan", "Learner"],
        ["Other", "Learner"],
      ]) {
        const user = await db.user.create({
          data: { name, role, email: `${prefix}-${name}@example.invalid` },
        });
        users.push(user);
      }
      [admin, learner, other] = users;
      token = jwt.sign({ id: learner.id }, env.ACCESS_TOKEN_SECRET);
      adminToken = jwt.sign({ id: admin.id }, env.ACCESS_TOKEN_SECRET);
      otherToken = jwt.sign({ id: other.id }, env.ACCESS_TOKEN_SECRET);
      const authed = (method, path, body, authToken = token) =>
        request(app)
          [method](`/api/lms${path}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send(body);
      await t.test(
        "staff creates courses, modules and lessons; learner cannot create courses",
        async () => {
          const data = {
            title: prefix,
            description: "Integration course",
            category: "Testing",
            price: 0,
            duration: "10 min",
            completionThreshold: 100,
          };
          assert.equal(
            (await authed("post", "/admin/courses", data)).status,
            403,
          );
          const res = await authed("post", "/admin/courses", data, adminToken);
          assert.equal(res.status, 201);
          courseId = res.body.data.id;
          const module = await authed(
            "post",
            "/admin/modules",
            { courseId, title: "Module", order: 0 },
            adminToken,
          );
          assert.equal(module.status, 201);
          const lesson = await authed(
            "post",
            "/admin/lessons",
            {
              moduleId: module.body.data.id,
              title: "Lesson",
              order: 0,
              durationSeconds: 100,
              videoUrl: "https://example.invalid/video.mp4",
              videoBytes: 1000,
            },
            adminToken,
          );
          assert.equal(lesson.status, 201);
          lessonId = lesson.body.data.id;
          const order = await authed(
            "put",
            `/admin/modules/${module.body.data.id}/order`,
            { ids: [lessonId] },
            adminToken,
          );
          assert.equal(order.status, 200);
          assert.equal(
            (
              await authed(
                "put",
                `/admin/modules/${module.body.data.id}/order`,
                { ids: [lessonId, lessonId] },
                adminToken,
              )
            ).status,
            400,
          );
          const assessment = await db.assessment.create({
            data: {
              title: "MCQ + coding",
              moduleId: module.body.data.id,
              totalMarks: 2,
              duration: 5,
              passPercentage: 100,
              maxAttempts: 3,
              questions: {
                create: [
                  {
                    questionText: "2 + 2?",
                    questionType: "MCQ",
                    marks: 1,
                    order: 0,
                    explanation: "Two plus two is four.",
                    options: {
                      create: [
                        { optionText: "4", isCorrect: true },
                        { optionText: "5", isCorrect: false },
                      ],
                    },
                  },
                  {
                    questionText: "Print 42",
                    questionType: "CODING",
                    marks: 1,
                    order: 1,
                    supportedLanguages: ["python"],
                    codingTestCases: {
                      create: {
                        input: "",
                        expectedOutput: "42",
                        marks: 1,
                        isHidden: true,
                      },
                    },
                  },
                ],
              },
            },
            include: { questions: { include: { options: true } } },
          });
          assessmentId = assessment.id;
          questionId = assessment.questions.find(
            (q) => q.questionType === "MCQ",
          ).id;
          optionId = assessment.questions
            .find((q) => q.questionType === "MCQ")
            .options.find((o) => o.isCorrect).id;
          const batch = await db.batch.create({
            data: {
              name: prefix,
              courseId,
              instructorName: "Instructor",
              capacity: 10,
              startDate: new Date(),
              endDate: new Date(Date.now() + 86400000),
            },
          });
          const enrollment = await authed(
            "post",
            "/admin/enrollments",
            {
              studentName: "Patan",
              studentEmail: learner.email,
              batchId: batch.id,
              courseAccess: true, // A staff create must ignore this forged unlock too.
            },
            adminToken,
          );
          assert.equal(enrollment.status, 201);
          assert.equal(enrollment.body.data.courseAccess, false);
          enrollmentId = enrollment.body.data.id;
        },
      );
      await t.test("learner cannot self-unlock through legacy or canonical enrollment APIs", async () => {
        for (const [method, path, body] of [
          ["patch", `/api/enrollments/${enrollmentId}/course-access`, { courseAccess: true }],
          ["put", `/api/enrollments/${enrollmentId}`, { courseAccess: true }],
          ["post", "/api/enrollments", { studentName: learner.name, studentEmail: learner.email, batchId: 1, courseAccess: true }],
        ]) {
          const denied = await request(app)[method](path).set("Authorization", `Bearer ${token}`).send(body);
          assert.equal(denied.status, 403, path);
        }
        const staffUnlock = await request(app).patch(`/api/enrollments/${enrollmentId}/course-access`).set("Authorization", `Bearer ${adminToken}`).send({ courseAccess: true });
        assert.equal(staffUnlock.status, 503);
        assert.equal(staffUnlock.body.code, "PAYMENT_WEBHOOK_REQUIRED");
        assert.equal((await db.enrollment.findUnique({ where: { id: enrollmentId } })).courseAccess, false);
      });
      await t.test(
        "locked enrollment cannot open paid content; another learner cannot read notes",
        async () => {
          assert.equal(
            (await authed("get", `/courses/${courseId}/player`)).status,
            403,
          );
          await db.enrollment.update({
            where: { id: enrollmentId },
            data: { courseAccess: true },
          }); // Payment-webhook fixture, not a production bypass.
          const player = await authed("get", `/courses/${courseId}/player`);
          assert.equal(player.status, 200);
          const path = `/enrollments/${enrollmentId}/lessons/${lessonId}/notes`;
          assert.equal(
            (await authed("put", path, { text: "My own notes" })).status,
            200,
          );
          assert.equal(
            (await authed("get", path, undefined, otherToken)).status,
            403,
          );
          assert.equal(
            (await authed("get", path)).body.data.text,
            "My own notes",
          );
        },
      );
      await t.test("staff overrides persisted lesson/course/pass/attempt rules; learner cannot", async () => {
        assert.equal((await db.lesson.findUnique({ where: { id: lessonId } })).completionThreshold, 90);
        const rulePath = `/admin/assessments/${assessmentId}/rules`;
        assert.equal((await authed("patch", rulePath, { passPercentage: 70, maxAttempts: 4 })).status, 403);
        const rules = await authed("patch", rulePath, { passPercentage: 70, maxAttempts: 4 }, adminToken);
        assert.equal(rules.status, 200);
        assert.equal(rules.body.data.passPercentage, 70);
        assert.equal(rules.body.data.maxAttempts, 4);
        assert.equal((await authed("patch", rulePath, { maxAttempts: 0 }, adminToken)).status, 400);
        await authed("patch", `/admin/courses/${courseId}`, { completionThreshold: 85 }, adminToken).expect(200);
        await authed("patch", `/admin/lessons/${lessonId}`, { completionThreshold: 95 }, adminToken).expect(200);
        let result = await service.sync(learner, [{ lessonId, enrollmentId, watchedSeconds: 90, baseVersion: null, updatedAt: new Date().toISOString() }]);
        assert.equal(result[0].progress.completed, false);
        await authed("patch", `/admin/lessons/${lessonId}`, { completionThreshold: 70 }, adminToken).expect(200);
        result = await service.sync(learner, [{ lessonId, enrollmentId, watchedSeconds: 80, baseVersion: result[0].progress.updatedAt.toISOString(), updatedAt: new Date().toISOString() }]);
        assert.equal(result[0].progress.completed, true);
        assert.equal((await db.course.findUnique({ where: { id: courseId } })).completionThreshold, 85);
        await db.lessonProgress.deleteMany({ where: { enrollmentId, lessonId } });
        await authed("patch", `/admin/lessons/${lessonId}`, { completionThreshold: 90 }, adminToken).expect(200);
        await authed("patch", `/admin/courses/${courseId}`, { completionThreshold: 100 }, adminToken).expect(200);
        await authed("patch", rulePath, { passPercentage: 100, maxAttempts: 3 }, adminToken).expect(200);
      });
      await t.test(
        "progress uses server duration and server version wins conflicts",
        async () => {
          const update = {
            enrollmentId,
            lessonId,
            watchedSeconds: 100,
            baseVersion: null,
            updatedAt: new Date().toISOString(),
          };
          const first = await authed("post", "/progress/sync", {
            updates: [update],
          });
          assert.equal(first.status, 200);
          assert.equal(first.body.data[0].progress.completed, true);
          const stale = await authed("post", "/progress/sync", {
            updates: [{ ...update, watchedSeconds: 0 }],
          });
          assert.equal(stale.body.data[0].conflict, true);
          assert.equal(stale.body.data[0].progress.watchedSeconds, 100);
        },
      );
      let attempt;
      await t.test(
        "start hides answers, resume retains server expiry, invalid submissions are rejected",
        async () => {
          const first = await request(app)
            .post(`/api/assessments/${assessmentId}/start`)
            .set("Authorization", `Bearer ${token}`)
            .send({ enrollmentId });
          assert.equal(first.status, 201);
          attempt = first.body.data;
          assert.equal(
            attempt.assessment.questions[0].options[0].isCorrect,
            undefined,
          );
          assert.equal(attempt.assessment.questions[0].explanation, undefined);
          assert.deepEqual(attempt.assessment.questions[1].codingTestCases, []);
          const second = await authed(
            "post",
            `/assessments/${assessmentId}/start`,
            { enrollmentId },
          );
          assert.equal(second.body.data.attemptId, attempt.attemptId);
          assert.equal(second.body.data.expiresAt, attempt.expiresAt);
          const invalid = await authed(
            "post",
            `/assessments/${assessmentId}/submit`,
            {
              attemptId: attempt.attemptId,
              answers: [{ questionId, selectedOptionId: 999999 }],
              timestamp: new Date().toISOString(),
            },
          );
          assert.equal(invalid.status, 400);
        },
      );
      await t.test(
        "submission grades, emits event and creates certificate with PDF upload and email",
        async () => {
          const coding = attempt.assessment.questions.find(
            (q) => q.questionType === "CODING",
          );
          const body = {
            attemptId: attempt.attemptId,
            answers: [
              { questionId, selectedOptionId: optionId },
              { questionId: coding.id, code: "print(42)", language: "python" },
            ],
            flaggedQuestionIds: [questionId],
            timestamp: new Date().toISOString(),
          };
          assert.equal(
            (await authed("post", `/assessments/${assessmentId}/submit`, body))
              .status,
            202,
          );
          // The HTTP route kicks the same durable worker; await its visible terminal state.
          for (let tries = 0; tries < 100; tries++) {
            await service.gradePending();
            const row = await db.assessmentSubmission.findUnique({
              where: { id: attempt.attemptId },
            });
            if (
              row.status === "GRADED" &&
              (await db.certificate.count({ where: { enrollmentId } }))
            )
              break;
            await new Promise((r) => setTimeout(r, 20));
          }
          await service.gradePending();
          const result = await authed(
            "get",
            `/attempts/${attempt.attemptId}/results`,
          );
          assert.equal(result.status, 200);
          assert.equal(result.body.data.percentage, 100);
          assert.equal(result.body.data.passed, true);
          assert.equal(result.body.data.questions[0].flagged, true);
          assert.equal(
            (
              await authed(
                "get",
                `/attempts/${attempt.attemptId}/results`,
                undefined,
                otherToken,
              )
            ).status,
            403,
          );
          assert.equal(uploads.length, 1);
          assert.equal(uploads[0].ContentType, "application/pdf");
          assert.equal(uploads[0].Body.subarray(0, 5).toString(), "%PDF-");
          assert.equal(emails.length, 1);
          assert.equal(events[0][1], "assessment:submitted");
          const duplicate = await authed(
            "post",
            `/assessments/${assessmentId}/submit`,
            body,
          );
          assert.equal(duplicate.status, 202);
          assert.equal(
            await db.submissionAnswer.count({
              where: { submissionId: attempt.attemptId },
            }),
            2,
          );
          const cert = await authed(
            "get",
            `/certificates/${result.body.data.certificateId}`,
          );
          assert.equal(cert.status, 200);
          assert.match(cert.body.data.pdfUrl, /X-Amz-Signature/);
        },
      );
      await t.test(
        "another learner cannot modify progress/attempts or retrieve/generate certificates",
        async () => {
          const checks = [
            [
              "post",
              "/progress/sync",
              {
                updates: [
                  {
                    lessonId,
                    enrollmentId,
                    watchedSeconds: 50,
                    baseVersion: null,
                    updatedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
            ["post", `/assessments/${assessmentId}/start`, { enrollmentId }],
            [
              "post",
              `/assessments/${assessmentId}/submit`,
              {
                attemptId: attempt.attemptId,
                answers: [],
                timestamp: new Date().toISOString(),
              },
            ],
            ["post", "/certificates/generate", { enrollmentId }],
          ];
          for (const [method, path, body] of checks)
            assert.equal(
              (await authed(method, path, body, otherToken)).status,
              403,
              path,
            );
          const certificate = await db.certificate.findUnique({
            where: { enrollmentId },
          });
          assert.equal(
            (
              await authed(
                "get",
                `/certificates/${certificate.id}`,
                undefined,
                otherToken,
              )
            ).status,
            403,
          );
        },
      );
      await t.test(
        "profile and admin analytics use the same persisted learner data",
        async () => {
          const profile = await authed("get", "/me");
          assert.equal(profile.body.data.stats.coursesCompleted, 1);
          assert.equal(profile.body.data.stats.certificatesEarned, 1);
          assert.equal((await authed("get", "/analytics")).status, 403);
          const report = await authed(
            "get",
            "/analytics",
            undefined,
            adminToken,
          );
          assert.equal(report.status, 200);
          assert.ok(report.body.data.kpis.enrollmentCount >= 1);
          assert.equal(
            (
              await authed(
                "get",
                "/analytics?from=2026-10-23&to=2026-10-22",
                undefined,
                adminToken,
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "CSV/PDF exports preserve Admin access checks and correct file content types",
        async () => {
          assert.equal(
            (await authed("get", "/analytics/export?format=csv")).status,
            403,
          );
          const csv = await authed(
            "get",
            "/analytics/export?format=csv&bucket=quarterly",
            undefined,
            adminToken,
          );
          assert.equal(csv.status, 200);
          assert.match(csv.headers["content-type"], /text\/csv/);
          assert.ok(csv.text.includes("enrollmentCount"));
          const pdf = await authed(
            "get",
            "/analytics/export?format=pdf",
            undefined,
            adminToken,
          );
          assert.equal(pdf.status, 200);
          assert.match(pdf.headers["content-type"], /application\/pdf/);
          assert.equal(pdf.body.subarray(0, 5).toString(), "%PDF-");
          assert.equal(
            (
              await authed(
                "get",
                "/analytics/export?format=xls",
                undefined,
                adminToken,
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "all-wrong, sandbox unavailable and timeout paths never issue a certificate",
        async () => {
          const main = await db.enrollment.findUnique({
            where: { id: enrollmentId },
          });
          const failedEnrollment = await db.enrollment.create({
            data: {
              studentName: "Other",
              studentEmail: other.email,
              batchId: main.batchId,
              courseAccess: true,
            },
          });
          await db.lessonProgress.create({
            data: {
              enrollmentId: failedEnrollment.id,
              lessonId,
              watchedSeconds: 100,
              totalDuration: 100,
              completed: true,
              watchPercentage: 100,
            },
          });
          const original = executor.execute;
          try {
            for (const code of [
              null,
              "EXECUTOR_UNAVAILABLE",
              "EXECUTION_TIMEOUT",
            ]) {
              const current = await service.start(
                other,
                assessmentId,
                failedEnrollment.id,
              );
              const coding = current.assessment.questions.find(
                (q) => q.questionType === "CODING",
              );
              executor.execute = async () => {
                const error = new Error(code);
                error.code = code;
                throw error;
              };
              await service.submit(other, assessmentId, {
                attemptId: current.attemptId,
                answers: code
                  ? [
                      { questionId, selectedOptionId: optionId },
                      {
                        questionId: coding.id,
                        code: "while True: pass",
                        language: "python",
                      },
                    ]
                  : [],
                flaggedQuestionIds: [],
                timestamp: new Date().toISOString(),
              });
              await service.gradePending();
              const result = await service.result(other, current.attemptId);
              assert.equal(result.status, code ? "FAILED" : "GRADED");
              if (code) assert.equal(result.error, code);
              else assert.equal(result.percentage, 0);
              assert.equal(
                await db.certificate.count({
                  where: { enrollmentId: failedEnrollment.id },
                }),
                0,
              );
            }
          } finally {
            executor.execute = original;
          }
        },
      );
      await t.test(
        "report jobs persist and concurrent workers do not send duplicate reports",
        async () => {
          const { createReportDelivery } = require("../report-delivery");
          const reportEnv = {
            LMS_REPORTS_ENABLED: "true",
            LMS_REPORT_RECIPIENTS: "reports@example.invalid",
            SENDGRID_API_KEY: "test-only",
            FROM_EMAIL: "sender@example.invalid",
          };
          const messages = [];
          const config = {
            db,
            analytics: service.analytics,
            env: reportEnv,
            send: async (message) => messages.push(message),
            now: () => new Date("2026-10-23T10:00:00Z"),
          };
          const first = createReportDelivery(config),
            second = createReportDelivery(config);
          try {
            await Promise.all([first.tick(), second.tick()]);
            assert.equal(messages.length, 1);
            assert.equal(messages[0].attachments.length, 2);
            assert.equal((await first.status()).recent[0].status, "SENT");
          } finally {
            await db.lmsReportDelivery.deleteMany({
              where: { periodKey: "weekly:2026-10-19" },
            });
          }
        },
      );
      await t.test("expiry is enforced by server", async () => {
        const newAttempt = await service.start(
          learner,
          assessmentId,
          enrollmentId,
        );
        await db.assessmentSubmission.update({
          where: { id: newAttempt.attemptId },
          data: { expiresAt: new Date(Date.now() - 20000) },
        });
        await assert.rejects(
          service.submit(learner, assessmentId, {
            attemptId: newAttempt.attemptId,
            answers: [],
            flaggedQuestionIds: [],
            timestamp: new Date().toISOString(),
          }),
          (e) => e.code === "ASSESSMENT_EXPIRED",
        );
      });
    } finally {
      if (courseId) {
        const enrollments = await db.enrollment.findMany({
          where: { batch: { courseId } },
          select: { id: true },
        });
        const ids = enrollments.map((e) => e.id);
        await db.lmsCertificateDelivery.deleteMany({
          where: { enrollmentId: { in: ids } },
        });
        await db.lmsNote.deleteMany({ where: { enrollmentId: { in: ids } } });
        await db.enrollment.deleteMany({ where: { id: { in: ids } } });
        await db.batch.deleteMany({ where: { courseId } });
        await db.course.delete({ where: { id: courseId } });
      }
      if (foreignCourseId)
        await db.course.delete({ where: { id: foreignCourseId } });
      await db.user.deleteMany({
        where: { id: { in: users.map((u) => u.id) } },
      });
      await db.$disconnect();
      if (originalDatabaseModule) require.cache[databaseModule] = originalDatabaseModule;
      else delete require.cache[databaseModule];
      if (originalSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
      else process.env.ACCESS_TOKEN_SECRET = originalSecret;
      s3.destroy();
    }
  },
);
