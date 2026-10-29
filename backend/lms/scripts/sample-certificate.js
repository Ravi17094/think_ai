require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { certificatePdf } = require("../certificate-template");
const { loadBranding } = require("../branding");
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.LMS_LOCAL_DEVELOPMENT !== "true" ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  )
    throw new Error(
      "This local sample command is restricted to the dedicated local development environment.",
    );
  const db = new PrismaClient();
  try {
    const row = await db.enrollment.findFirst({
      where: { studentEmail: "patan@local.test" },
      include: { batch: { include: { course: true } } },
    });
    if (!row)
      throw new Error(
        "Run local setup first; the sample reads the practice learner and course.",
      );
    const stored = await db.certificate.findUnique({
      where: { enrollmentId: row.id },
    });
    const cert = stored || {
      studentName: row.studentName,
      courseName: row.batch.course.title,
      issuedAt: new Date(),
      certificateNo: `SAMPLE-${randomUUID()}`,
    };
    const file = path.resolve(
      __dirname,
      "../../../deliverables/sample-certificate.pdf",
    );
    await fs.writeFile(file, await certificatePdf(cert, { sample: true }));
    const brand = loadBranding();
    await fs.writeFile(
      file.replace(/\.pdf$/, ".json"),
      JSON.stringify(
        {
          environment: "Local practice data, not staging",
          studentName: cert.studentName,
          courseName: cert.courseName,
          issuedAt: cert.issuedAt,
          certificateNo: cert.certificateNo,
          clientLogoVerified: false,
          clientAccreditationVerified: false,
          clientSignatureVerified: false,
          logoTargetCoordinates: { x: 50, y: 40 },
          brandingApproved: brand.approved,
          nativeShareVerified: false,
        },
        null,
        2,
      ),
    );
    console.log(
      "Archived a clearly labelled local sample certificate and its verification metadata.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
