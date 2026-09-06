require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COURSE_TITLE = "TA Demo: JavaScript Fundamentals";
const BATCH_NAME = "TA Demo Batch";
const MODULE_TITLE = "TA Demo Module";
const ASSESSMENT_TITLE = "TA Demo: Variables Check";
const LEARNER_EMAIL = "ta.demo.learner@thinkz.local";

async function findOrCreateCourse() {
  const existing = await prisma.course.findFirst({ where: { title: COURSE_TITLE } });
  if (existing) return existing;

  return prisma.course.create({
    data: {
      title: COURSE_TITLE,
      description: "Local data used to demonstrate the Teaching Assistant grading queue.",
      category: "Programming",
      price: 0,
      duration: "1 hour",
      instructorName: "TA Demo Instructor",
      instructorDetails: "Local testing account",
      status: "ACTIVE"
    }
  });
}

async function main() {
  const course = await findOrCreateCourse();

  let batch = await prisma.batch.findFirst({
    where: { courseId: course.id, name: BATCH_NAME }
  });
  if (!batch) {
    batch = await prisma.batch.create({
      data: {
        name: BATCH_NAME,
        courseId: course.id,
        instructorName: "TA Demo Instructor",
        capacity: 30,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "ACTIVE"
      }
    });
  }

  let enrollment = await prisma.enrollment.findFirst({
    where: { batchId: batch.id, studentEmail: LEARNER_EMAIL }
  });
  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        studentName: "Demo Learner",
        studentEmail: LEARNER_EMAIL,
        batchId: batch.id,
        enrollmentStatus: "ENROLLED",
        courseAccess: true
      }
    });
  }

  let moduleItem = await prisma.module.findFirst({
    where: { courseId: course.id, title: MODULE_TITLE }
  });
  if (!moduleItem) {
    moduleItem = await prisma.module.create({
      data: { title: MODULE_TITLE, description: "Module for TA grading demonstration.", courseId: course.id }
    });
  }

  let assessment = await prisma.assessment.findFirst({
    where: { moduleId: moduleItem.id, title: ASSESSMENT_TITLE },
    include: { questions: { include: { options: true } } }
  });
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        title: ASSESSMENT_TITLE,
        description: "A small submitted assessment for TA grading practice.",
        type: "MCQ",
        totalMarks: 10,
        duration: 10,
        status: "ACTIVE",
        moduleId: moduleItem.id,
        questions: {
          create: {
            questionText: "Which keyword declares a block-scoped variable in JavaScript?",
            questionType: "MCQ",
            marks: 10,
            order: 1,
            options: {
              create: [
                { optionText: "let", isCorrect: true },
                { optionText: "print", isCorrect: false }
              ]
            }
          }
        }
      },
      include: { questions: { include: { options: true } } }
    });
  }

  const existingSubmission = await prisma.assessmentSubmission.findFirst({
    where: { assessmentId: assessment.id, enrollmentId: enrollment.id, status: "SUBMITTED" }
  });

  if (!existingSubmission) {
    const question = assessment.questions[0];
    const selectedOption = question.options[0];
    await prisma.assessmentSubmission.create({
      data: {
        assessmentId: assessment.id,
        enrollmentId: enrollment.id,
        totalMarks: assessment.totalMarks,
        status: "SUBMITTED",
        answers: {
          create: {
            questionId: question.id,
            selectedOptionId: selectedOption.id,
            isCorrect: true,
            marksObtained: 10
          }
        }
      }
    });
  }

  console.log("TA demo data is ready. Open http://localhost:5173/ta and grade Demo Learner's submission.");
}

main()
  .catch((error) => {
    console.error("Could not create TA demo data:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
