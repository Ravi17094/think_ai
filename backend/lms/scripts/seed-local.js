require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.NODE_ENV === "production" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.pathname !== "/patan_local" ||
    process.env.LMS_LOCAL_DEVELOPMENT !== "true"
  )
    throw new Error("Local seed is restricted to the dedicated patan_local development database.");
  const db = new PrismaClient();
  const local = path.resolve(__dirname, "../../.local");
  fs.mkdirSync(local, { recursive: true });
  const video = path.resolve(__dirname, "../fixtures/local-practice.mp4");
  const videoData = fs.existsSync(video)
    ? { videoUrl: process.env.LMS_PRACTICE_MEDIA_URL || `http://localhost:${process.env.PORT || 5000}/local-practice-media/practice.mp4`, videoBytes: fs.statSync(video).size, durationSeconds: 12 }
    : { durationSeconds: 60 };
  const logins = path.join(local, "LOCAL_LOGIN.txt");
  let preservedPassword;
  if (fs.existsSync(logins)) {
    preservedPassword = fs.readFileSync(logins, "utf8").match(/^Password for both: (.+)$/m)?.[1]?.trim();
    if (!preservedPassword) {
      await db.$disconnect();
      throw new Error("The local login file is invalid; refusing to replace existing credentials.");
    }
    const accounts = await db.user.findMany({
      where: { email: { in: ["patan@local.test", "admin@local.test"] } },
      select: { email: true, role: true, password: true },
    });
    if (accounts.length) {
      const roles = { "patan@local.test": "learner", "admin@local.test": "admin" };
      const valid = accounts.length === 2 && (await Promise.all(accounts.map(async (account) =>
        String(account.role).toLowerCase() === roles[account.email] &&
        await bcrypt.compare(preservedPassword, account.password)
      ))).every(Boolean);
      if (!valid) {
        await db.$disconnect();
        throw new Error("Current database accounts do not match the local login file; refusing to overwrite passwords or roles.");
      }
      try {
        await db.lesson.updateMany({
          where: { title: "Using your learning workspace", module: { course: { title: "Local practice: LMS walkthrough" } } },
          data: videoData,
        });
      } finally { await db.$disconnect(); }
      console.log("Local accounts verified in the current database; passwords and progress were preserved.");
      return;
    }
    // The credentials file may remain after changing/recreating the local DB.
    // Reuse its documented password only when both accounts are absent.
  }
  const password = preservedPassword || crypto.randomBytes(15).toString("base64url");
  const hashed = await bcrypt.hash(password, 12);
  try {
    await db.$transaction(async (tx) => {
      for (const [email, name, role] of [
        ["patan@local.test", "Patan", "Learner"],
        ["admin@local.test", "Local Admin", "Admin"],
      ]) {
        if (await tx.user.findUnique({ where: { email } }))
          throw new Error("Local accounts already exist; refusing to overwrite credentials.");
        await tx.user.create({ data: { email, name, role, password: hashed } });
      }
      const course = await tx.course.findFirst({ where: { title: "Local practice: LMS walkthrough" } }) || await tx.course.create({
        data: {
          title: "Local practice: LMS walkthrough",
          description: "Practice content for checking the local installation. This is not approved client curriculum.",
          category: "Local development",
          price: 0,
          duration: "5 minutes",
          completionThreshold: 80,
          instructorName: "Local practice",
          modules: {
            create: {
              title: "Getting started",
              order: 0,
              lessons: {
                create: {
                  title: "Using your learning workspace",
                  content: "This local practice course uses the real PostgreSQL database and authenticated LMS APIs. Try saving a note, opening the assessment, flagging a question, submitting your answer and viewing your profile. Approved client videos and curriculum still need to be configured.",
                  order: 0,
                  ...videoData,
                },
              },
              assessments: {
                create: {
                  title: "Local practice assessment",
                  description: "Practice data only; this is not a client assessment.",
                  totalMarks: 2,
                  duration: 10,
                  maxAttempts: 10,
                  passPercentage: 50,
                  questions: {
                    create: [
                      {
                        questionText: "Which feature saves assessment answers while you work?",
                        explanation: "Draft auto-save preserves answers for resuming the same attempt.",
                        order: 0,
                        marks: 1,
                        options: { create: [{ optionText: "Draft auto-save", isCorrect: true }, { optionText: "Signing out", isCorrect: false }] },
                      },
                      {
                        questionText: "Where should private API keys be configured?",
                        explanation: "Private credentials belong in approved environment configuration, not source code or chat.",
                        order: 1,
                        marks: 1,
                        options: { create: [{ optionText: "Public source files", isCorrect: false }, { optionText: "Local environment configuration", isCorrect: true }] },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      });
      const batch = await tx.batch.findFirst({ where: { courseId: course.id, name: "Local practice" } }) || await tx.batch.create({ data: { name: "Local practice", courseId: course.id, instructorName: "Local practice", capacity: 10, startDate: new Date(), endDate: new Date(Date.now() + 365 * 86400000) } });
      if (!(await tx.enrollment.findFirst({ where: { studentEmail: "patan@local.test", batchId: batch.id } }))) await tx.enrollment.create({ data: { studentName: "Patan", studentEmail: "patan@local.test", batchId: batch.id, courseAccess: true } });
    });
    if (!preservedPassword) fs.writeFileSync(logins, `LOCAL DEVELOPMENT ACCOUNTS ONLY\nLearner: patan@local.test\nAdmin: admin@local.test\nPassword for both: ${password}\n\nWeb: ${process.env.LMS_APP_URL || "http://localhost:8081"}\nThese accounts exist only in the separate patan_local database.\n`);
    console.log("Practice course and local accounts created. Credentials are in backend/.local/LOCAL_LOGIN.txt.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
