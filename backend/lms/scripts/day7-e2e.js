require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { createService } = require("../service");
const { createExecutor } = require("../executor");
const { createCertificates } = require("../certificates");
const { loadBranding } = require("../branding");
const { receiptEvidence } = require("../acceptance");
const { sendThroughSendGrid } = require("../email-delivery");
async function main() {
  // Accept the deployment names supplied by the team without rewriting .env.
  if (!process.env.JUDGE0_URL && process.env.JUDGE0_API_URL)
    process.env.JUDGE0_URL = process.env.JUDGE0_API_URL;
  if (!process.env.LMS_CERTIFICATE_BUCKET && process.env.AWS_S3_BUCKET)
    process.env.LMS_CERTIFICATE_BUCKET = process.env.AWS_S3_BUCKET;
  if (!process.env.AWS_REGION && process.env.AWS_S3_REGION)
    process.env.AWS_REGION = process.env.AWS_S3_REGION;
  const out = path.resolve(
    __dirname,
    "../../../deliverables/assessment-cert-e2e.json",
  );
  const required = [
    "LMS_E2E_DATABASE_URL",
    "LMS_E2E_RECIPIENT",
    "JUDGE0_URL",
    "LMS_CERTIFICATE_BUCKET",
    "SENDGRID_API_KEY",
    "FROM_EMAIL",
    "LMS_APP_URL",
    "LMS_BRANDING_FILE",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (process.env.LMS_E2E_ENVIRONMENT !== "staging")
    missing.push("LMS_E2E_ENVIRONMENT=staging");
  if (missing.length) {
    const report = {
      status: "NOT_RUN",
      missing,
      note: "No staging data, cloud writes or emails were created. Local isolated integration tests cover the flow with test adapters, separately.",
    };
    await fs.writeFile(out, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  loadBranding({ ...process.env, LMS_REQUIRE_APPROVED_BRANDING: "true" });
  const db = new PrismaClient({
    datasourceUrl: process.env.LMS_E2E_DATABASE_URL,
  });
  const report = {
    status: "IN_PROGRESS",
    environment: "staging",
    startedAt: new Date().toISOString(),
    paymentWebhookVerified: false,
  };
  try {
    const user = await db.user.findUnique({
      where: { email: process.env.LMS_E2E_RECIPIENT },
    });
    if (!user || user.role.toLowerCase() !== "learner")
      throw new Error(
        "Configure an existing approved staging learner account as LMS_E2E_RECIPIENT.",
      );
    const messages = [];
    const certificates = createCertificates({
      db,
      sendEmail: async (message) => {
        const accepted = await sendThroughSendGrid(message, process.env);
        messages.push(message);
        return accepted;
      },
    });
    const service = createService({
      db,
      executor: createExecutor(),
      certificates,
    });
    const course = await db.course.create({
      data: {
        title: `Day 7 staging E2E ${Date.now()}`,
        description: "Automated staging acceptance fixture",
        category: "Verification",
        price: 0,
        duration: "1 minute",
        completionThreshold: 100,
        modules: {
          create: {
            title: "E2E module",
            order: 0,
            lessons: {
              create: {
                title: "Fixture lesson",
                durationSeconds: 60,
                order: 0,
              },
            },
            assessments: {
              create: {
                title: "MCQ and real code",
                duration: 5,
                totalMarks: 2,
                passPercentage: 100,
                questions: {
                  create: [
                    {
                      questionText: "2 + 2?",
                      marks: 1,
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
                      order: 1,
                      marks: 1,
                      supportedLanguages: ["python"],
                      codingTestCases: {
                        create: { input: "", expectedOutput: "42", marks: 1 },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      include: {
        modules: {
          include: {
            lessons: true,
            assessments: {
              include: { questions: { include: { options: true } } },
            },
          },
        },
      },
    });
    report.courseId = course.id;
    const module = course.modules[0],
      assessment = module.assessments[0];
    const batch = await db.batch.create({
      data: {
        name: "Day 7 E2E",
        courseId: course.id,
        instructorName: "Acceptance test",
        capacity: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      },
    });
    const enrollment = await db.enrollment.create({
      data: {
        studentName: user.name || user.email,
        studentEmail: user.email,
        batchId: batch.id,
        courseAccess: true,
      },
    });
    report.enrollmentId = enrollment.id;
    await db.lessonProgress.create({
      data: {
        enrollmentId: enrollment.id,
        lessonId: module.lessons[0].id,
        completed: true,
        watchedSeconds: 60,
        totalDuration: 60,
        watchPercentage: 100,
      },
    });
    const attempt = await service.start(user, assessment.id, enrollment.id);
    const submittedAt = new Date();
    const began = performance.now();
    report.submittedAt = submittedAt.toISOString();
    await service.submit(user, assessment.id, {
      attemptId: attempt.attemptId,
      answers: assessment.questions.map((q) =>
        q.questionType === "MCQ"
          ? {
              questionId: q.id,
              selectedOptionId: q.options.find((o) => o.isCorrect).id,
            }
          : { questionId: q.id, code: "print(42)", language: "python" },
      ),
      flaggedQuestionIds: [],
      timestamp: report.submittedAt,
    });
    let cert;
    for (let i = 0; i < 12; i++) {
      await service.gradePending();
      cert = await db.certificate.findUnique({
        where: { enrollmentId: enrollment.id },
      });
      const delivered = await db.lmsCertificateDelivery.findUnique({
        where: { enrollmentId: enrollment.id },
      });
      if (cert?.pdfUrl && delivered?.status === "SENT") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    const result = await service.result(user, attempt.attemptId);
    if (result.percentage !== 100 || !result.passed || !cert?.pdfUrl)
      throw new Error(
        `Expected 100% pass and certificate; result ${result.status}.`,
      );
    const url = await certificates.downloadUrl(cert),
      response = await fetch(url),
      buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok || buffer.subarray(0, 5).toString() !== "%PDF-")
      throw new Error("Certificate download failed.");
    await fs.writeFile(
      path.resolve(__dirname, "../../../deliverables/sample-certificate.pdf"),
      buffer,
    );
    const flowSeconds = (performance.now() - began) / 1000;
    report.flowTimeSeconds = Number(flowSeconds.toFixed(3));
    report.flowWithin30Seconds = flowSeconds < 30;
    report.certificateId = cert.id;
    report.certificateNo = cert.certificateNo;
    report.stableLink = `${process.env.LMS_APP_URL.replace(/\/$/, "")}/learner/certificates/${cert.id}`;
    report.pdfDownloaded = true;
    report.storageUri = cert.pdfUrl;
    report.emailProviderAccepted = messages.length > 0;
    let receipt;
    if (process.env.LMS_E2E_EMAIL_RECEIPT_FILE) {
      receipt = JSON.parse(
        await fs.readFile(process.env.LMS_E2E_EMAIL_RECEIPT_FILE, "utf8"),
      );
    }
    report.receiptCheckedAt = new Date().toISOString();
    Object.assign(
      report,
      receiptEvidence({
        receipt,
        certificateNo: cert.certificateNo,
        link: report.stableLink,
        submittedAt,
        checkedAt: report.receiptCheckedAt,
      }),
    );
    report.within30Seconds =
      report.flowWithin30Seconds && report.emailWithin30Seconds === true;
    report.status =
      report.within30Seconds &&
      report.emailProviderAccepted &&
      report.recipientDeliveryConfirmed
        ? "PASS"
        : "PENDING_RECIPIENT_OR_TIMING_VERIFICATION";
    report.note =
      "Staging fixtures are retained for evidence. Provider acceptance is distinct from confirmed inbox delivery. After the actual inbox receipt is available, run node lms/scripts/verify-certificate-receipt.js to verify this same run without creating another fixture or email. Review the PDF text and client template, and verify native sharing separately.";
  } catch (error) {
    report.status = "FAIL";
    report.error = error.message;
    process.exitCode = 1;
  } finally {
    await fs.writeFile(out, JSON.stringify(report, null, 2));
    await db.$disconnect();
    console.log(JSON.stringify(report, null, 2));
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
