require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { createAnalytics } = require("../analytics");
const { courseTree } = require("../service");
const { percentile } = require("../stress-runner");
const { analyticsCsv, analyticsPdf } = require("../reports");
async function main() {
  const url = new URL(process.env.LMS_BASELINE_DATABASE_URL || "");
  assert.ok(
    ["127.0.0.1", "localhost"].includes(url.hostname) &&
      url.pathname === "/patan_day7_validation",
    "Use only the dedicated patan_day7_validation local database.",
  );
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const out = path.resolve(__dirname, "../../../deliverables");
  try {
    assert.equal(
      await db.course.count(),
      0,
      "Baseline database must be empty; preserve existing data and use a fresh validation database.",
    );
    const lessons = [],
      assessments = [],
      batches = [];
    for (let i = 0; i < 2; i++) {
      const course = await db.course.create({
        data: {
          title: `Baseline practice course ${i + 1}`,
          description: "Synthetic local validation fixture",
          category: "Local verification",
          price: 0,
          duration: "10 minutes",
          completionThreshold: 80,
        },
      });
      const module = await db.module.create({
        data: { courseId: course.id, title: "Practice module", order: 0 },
      });
      lessons.push(
        await db.lesson.create({
          data: {
            moduleId: module.id,
            title: "Practice lesson",
            order: 0,
            durationSeconds: 100,
          },
        }),
      );
      assessments.push(
        await db.assessment.create({
          data: {
            moduleId: module.id,
            title: "Practice assessment",
            totalMarks: 100,
            passPercentage: 60,
          },
        }),
      );
      batches.push(
        await db.batch.create({
          data: {
            courseId: course.id,
            name: `Baseline batch ${i + 1}`,
            instructorName: "Local fixture",
            capacity: 10,
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-12-31"),
          },
        }),
      );
    }
    const dates = [
      "2026-01-15",
      "2026-03-31",
      "2026-04-01",
      "2026-07-01",
      "2026-09-30",
      "2026-10-01",
    ];
    const scores = [100, 80, 0, 60, 40, 90],
      completed = [true, true, false, true, false, true];
    const source = [];
    for (let i = 0; i < dates.length; i++) {
      const email = `baseline-${i}@example.invalid`,
        at = new Date(`${dates[i]}T12:00:00Z`),
        c = i % 2;
      await db.user.create({ data: { name: `Local fixture ${i + 1}`, email } });
      const row = await db.enrollment.create({
        data: {
          studentName: `Local fixture ${i + 1}`,
          studentEmail: email,
          batchId: batches[c].id,
          enrolledAt: at,
          courseAccess: true,
        },
      });
      await db.lessonProgress.create({
        data: {
          enrollmentId: row.id,
          lessonId: lessons[c].id,
          completed: completed[i],
          watchedSeconds: completed[i] ? 100 : 50,
          totalDuration: 100,
          watchPercentage: completed[i] ? 100 : 50,
          updatedAt: at,
        },
      });
      await db.assessmentSubmission.create({
        data: {
          assessmentId: assessments[c].id,
          enrollmentId: row.id,
          status: "GRADED",
          totalMarks: 100,
          score: scores[i],
          percentage: scores[i],
          submittedAt: at,
          startedAt: at,
        },
      });
      source.push({
        id: row.id,
        date: dates[i],
        course: `Baseline practice course ${c + 1}`,
        completed: Number(completed[i]),
        score: scores[i],
      });
    }
    const attendance = {
      source: "Generated local validation roster; not client attendance",
      environment: "local-fixture",
      rows: ["PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"].map(
        (status, i) => ({
          sessionId: "local-baseline",
          userId: String(i + 1),
          date: "2026-10-01",
          status,
        }),
      ),
    };
    const local = path.resolve(__dirname, "../../.local");
    await fs.mkdir(local, { recursive: true });
    const roster = path.join(local, "baseline-attendance.json");
    await fs.writeFile(roster, JSON.stringify(attendance, null, 2));
    const analytics = createAnalytics({
      db,
      courseTree,
      env: { LMS_LOCAL_DEVELOPMENT: "true", LMS_ATTENDANCE_FILE: roster },
    });
    const samples = [],
      reports = [];
    for (const bucket of ["weekly", "monthly", "quarterly"]) {
      for (let i = 0; i < 5; i++) {
        const began = performance.now();
        const data = await analytics({
          from: "2026-01-01",
          to: "2026-10-23",
          bucket,
        });
        samples.push({
          bucket,
          run: i + 1,
          latencyMs: Number((performance.now() - began).toFixed(3)),
        });
        if (!i) reports.push(data);
      }
    }
    const metrics = reports[0].kpis;
    const manual = {
      enrollmentCount: 6,
      completionRate: (4 / 6) * 100,
      averageScore: 370 / 6,
      activeUsers: 6,
      attendancePercentage: 75,
    };
    for (const [key, value] of Object.entries(manual))
      assert.ok(
        Math.abs(metrics[key] - value) < 0.000001,
        `${key} differs from the independent fixture counts`,
      );
    for (const bucket of ["weekly", "monthly", "quarterly"]) {
      const trunc =
        bucket === "weekly"
          ? "week"
          : bucket === "monthly"
            ? "month"
            : "quarter";
      const sql = await db.$queryRawUnsafe(
        `SELECT date_trunc('${trunc}', "enrolledAt") AS period, COUNT(*)::int AS count FROM "Enrollment" GROUP BY 1 ORDER BY 1`,
      );
      assert.equal(
        reports.find((r) => r.bucket === bucket).trend.length,
        sql.length,
      );
      assert.deepEqual(
        reports.find((r) => r.bucket === bucket).trend.map((r) => r.count),
        sql.map((r) => r.count),
      );
    }
    const from = await analytics({
      from: "2026-04-01",
      to: "2026-09-30",
      bucket: "quarterly",
    });
    assert.equal(from.kpis.enrollmentCount, 3);
    const report = {
      createdAt: new Date().toISOString(),
      environment: "Local PostgreSQL 18 validation fixture; not staging",
      source,
      attendance: attendance.rows,
      api: metrics,
      manual,
      samples,
      periods: reports.map((r) => ({ bucket: r.bucket, trend: r.trend })),
      performance: Object.fromEntries(
        ["weekly", "monthly", "quarterly"].map((bucket) => {
          const rows = samples
            .filter((s) => s.bucket === bucket)
            .map((s) => s.latencyMs);
          return [
            bucket,
            {
              samples: rows.length,
              p50Ms: percentile(rows, 0.5),
              p95Ms: percentile(rows, 0.95),
              p99Ms: percentile(rows, 0.99),
            },
          ];
        }),
      ),
      checks: [
        "KPI values match independent fixture counts",
        "Weekly/monthly/quarterly trend counts match PostgreSQL date_trunc grouping",
        "Inclusive date range 2026-04-01 to 2026-09-30 contains exactly three enrollments",
      ],
      pending: [
        "Staging data and performance baseline",
        "Approved client attendance definition and source",
        "Client branding and report recipients",
      ],
    };
    await fs.mkdir(out, { recursive: true });
    await fs.writeFile(
      path.join(out, "analytics-baseline-data.json"),
      JSON.stringify(report, null, 2),
    );
    await fs.writeFile(
      path.join(local, "analytics-export.csv"),
      analyticsCsv(reports[0]),
    );
    await fs.writeFile(
      path.join(local, "analytics-export.pdf"),
      await analyticsPdf(reports[0], { env: {} }),
    );
    console.log(
      JSON.stringify(
        {
          environment: report.environment,
          api: metrics,
          checks: report.checks,
          performance: report.performance,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
