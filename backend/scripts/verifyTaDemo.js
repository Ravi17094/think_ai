require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const learnerEmail = "ta.demo.learner@thinkz.local";
const courseTitle = "TA Demo: JavaScript Fundamentals";
const assessmentTitle = "TA Demo: Variables Check";

async function verify() {
  const learner = await prisma.user.findUnique({ where: { email: learnerEmail } });
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentEmail: learnerEmail, courseAccess: true, enrollmentStatus: "ENROLLED" },
    include: {
      batch: { include: { course: true } },
      assessmentSubmissions: { include: { assessment: true } },
    },
  });

  const errors = [];
  if (!learner || learner.role !== "Learner") errors.push("Learner account is missing or has the wrong role.");
  if (!enrollment) errors.push("Active learner enrollment is missing.");
  if (enrollment?.batch.course.title !== courseTitle) errors.push("Demo course is missing or not linked to the learner.");
  const submission = enrollment?.assessmentSubmissions.find((item) => item.assessment.title === assessmentTitle);
  if (!submission || submission.status !== "SUBMITTED") errors.push("Demo assessment submission is missing.");

  if (errors.length) {
    console.error("TA demo verification failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log("TA demo verification passed.");
  console.log(`Learner: ${learner.email}`);
  console.log(`Course: ${enrollment.batch.course.title}`);
  console.log(`Batch: ${enrollment.batch.name}`);
  console.log(`Assessment: ${submission.assessment.title}`);
  console.log(`Submission status: ${submission.status}`);
  console.log("Instructor and TA data are ready for the Demo Learner workflow.");
}

verify()
  .catch((error) => {
    console.error("Could not verify TA demo data:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
