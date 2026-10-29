require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
async function main() {
  const input = process.argv[2];
  if (!input)
    throw new Error(
      "Usage: npm run verify:content -- path/to/approved-client-manifest.json",
    );
  const manifest = JSON.parse(await fs.readFile(input, "utf8"));
  const db = new PrismaClient();
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const checks = [];
  try {
    if (
      !manifest.bucket ||
      !Array.isArray(manifest.courses) ||
      !manifest.courses.length ||
      !Array.isArray(manifest.videos) ||
      !manifest.videos.length
    )
      throw new Error(
        "Manifest requires bucket, courses[], videos[]. See deliverables/client-manifest.example.json.",
      );
    for (const video of manifest.videos) {
      try {
        if (!/^[a-f0-9]{32}$/i.test(video.md5))
          throw new Error("Approved MD5 is missing or invalid.");
        const object = await s3.send(
          new GetObjectCommand({ Bucket: manifest.bucket, Key: video.key }),
        );
        const hash = createHash("md5");
        let bytes = 0;
        for await (const chunk of object.Body) {
          hash.update(chunk);
          bytes += chunk.length;
        }
        const checksum = hash.digest("hex");
        checks.push({
          kind: "video",
          key: video.key,
          passed:
            checksum === video.md5.toLowerCase() &&
            (!video.bytes || video.bytes === bytes),
          actualMd5: checksum,
          bytes,
        });
      } catch (e) {
        checks.push({
          kind: "video",
          key: video.key,
          passed: false,
          error: e.message,
        });
      }
    }
    for (const expected of manifest.courses) {
      const course = await db.course.findUnique({
        where: { id: expected.id },
        include: {
          modules: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
            include: {
              lessons: { orderBy: [{ order: "asc" }, { id: "asc" }] },
              assessments: {
                include: {
                  questions: {
                    orderBy: [{ order: "asc" }, { id: "asc" }],
                    include: { options: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!course) {
        checks.push({
          kind: "course",
          id: expected.id,
          passed: false,
          error: "Missing course",
        });
        continue;
      }
      const actual = course.modules.map((m) => ({
        id: m.id,
        lessonIds: m.lessons.map((l) => l.id),
      }));
      checks.push({
        kind: "curriculum",
        id: expected.id,
        passed: JSON.stringify(actual) === JSON.stringify(expected.modules),
      });
      checks.push({
        kind: "completion",
        id: expected.id,
        passed: course.completionThreshold === expected.completionThreshold,
      });
      for (const expectedAssessment of expected.assessments || []) {
        const assessment = course.modules
          .flatMap((m) => m.assessments)
          .find((a) => a.id === expectedAssessment.id);
        checks.push({
          kind: "assessment-rules",
          id: expectedAssessment.id,
          passed:
            !!assessment &&
            assessment.passPercentage === expectedAssessment.passPercentage &&
            assessment.maxAttempts === expectedAssessment.maxAttempts,
        });
        for (const expectedQuestion of expectedAssessment.questions || []) {
          const question = assessment?.questions.find(
            (q) => q.id === expectedQuestion.id,
          );
          const correct =
            question?.options
              .filter((o) => o.isCorrect)
              .map((o) => o.id)
              .sort((a, b) => a - b) || [];
          checks.push({
            kind: "question",
            id: expectedQuestion.id,
            passed:
              !!question &&
              question.questionText === expectedQuestion.text &&
              question.explanation === expectedQuestion.explanation &&
              JSON.stringify(correct) ===
                JSON.stringify(
                  [...expectedQuestion.correctOptionIds].sort((a, b) => a - b),
                ),
          });
        }
      }
    }
    const report = {
      verifiedAt: new Date().toISOString(),
      checks,
      automatedChecksPassed: checks.every((c) => c.passed),
      manualChecksPending: [
        "Chrome/Firefox/Safari/Edge playback and codec review",
        "Full journey using real payment, Judge0, S3 and email",
        "Client content-owner approval",
      ],
    };
    const output = path.resolve(
      __dirname,
      "../../../deliverables/course-content-verification.json",
    );
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
    console.log(
      `Checks: ${checks.filter((c) => c.passed).length}/${checks.length}. Report: ${output}`,
    );
    if (!report.automatedChecksPassed) process.exitCode = 1;
  } finally {
    await db.$disconnect();
    s3.destroy();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
