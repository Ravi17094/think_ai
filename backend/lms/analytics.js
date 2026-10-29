const fs = require("node:fs/promises");
const { z } = require("zod");
const { check } = require("./errors");
const { completion } = require("./completion");
const attendanceSchema = z.object({
  source: z.string().min(1),
  environment: z.enum(["local-fixture", "staging", "production"]),
  rows: z.array(
    z.object({
      sessionId: z.string().min(1),
      userId: z.string().min(1),
      date: z.string().date(),
      status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]),
    }),
  ),
});
function periodKey(value, bucket) {
  const date = new Date(value);
  if (bucket === "weekly")
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  if (bucket === "quarterly")
    return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  return date.toISOString().slice(0, bucket === "monthly" ? 7 : 10);
}
async function attendance({ from, to }, env = process.env) {
  if (!env.LMS_ATTENDANCE_FILE)
    return {
      percentage: null,
      status: "unavailable",
      source: "Attendance roster export is not configured",
      eligible: null,
      attended: null,
      excused: null,
    };
  const source = attendanceSchema.parse(
    JSON.parse(await fs.readFile(env.LMS_ATTENDANCE_FILE, "utf8")),
  );
  check(
    source.environment !== "local-fixture" ||
      env.LMS_LOCAL_DEVELOPMENT === "true",
    503,
    "ATTENDANCE_SOURCE_INVALID",
    "Local attendance fixtures cannot be used in a shared environment.",
  );
  const keys = new Set();
  for (const row of source.rows) {
    const key = JSON.stringify([row.sessionId, row.userId]);
    check(
      !keys.has(key),
      503,
      "ATTENDANCE_DUPLICATE",
      "Attendance roster contains a duplicate session/user record.",
    );
    keys.add(key);
  }
  const rows = source.rows.filter(
    (r) => (!from || r.date >= from) && (!to || r.date <= to),
  );
  const eligible = rows.filter((r) => r.status !== "EXCUSED").length;
  const attended = rows.filter((r) =>
    ["PRESENT", "LATE"].includes(r.status),
  ).length;
  return {
    percentage: eligible ? (attended / eligible) * 100 : null,
    status: "available",
    source: source.source,
    environment: source.environment,
    eligible,
    attended,
    excused: rows.length - eligible,
  };
}
function createAnalytics({
  db,
  courseTree,
  now = () => new Date(),
  env = process.env,
}) {
  return async ({ from, to, bucket = "daily" }) => {
    const start = new Date(`${from || "2000-01-01"}T00:00:00Z`);
    const end = to ? new Date(`${to}T23:59:59.999Z`) : now();
    check(
      start <= end,
      400,
      "INVALID_DATE_RANGE",
      "Start date must be before end date.",
    );
    const time = { gte: start, lte: end };
    const [rows, graded, active, roster] = await Promise.all([
      db.enrollment.findMany({
        where: { enrolledAt: time },
        include: {
          batch: { include: { course: { include: courseTree } } },
          lessonProgress: true,
          assessmentSubmissions: { where: { status: "GRADED" } },
        },
      }),
      db.assessmentSubmission.findMany({
        where: { status: "GRADED", submittedAt: time },
        select: { percentage: true },
      }),
      db.lessonProgress.findMany({
        where: { updatedAt: time },
        select: { enrollment: { select: { studentEmail: true } } },
      }),
      attendance({ from, to }, env),
    ]);
    const courses = new Map(),
      trend = new Map();
    let completed = 0;
    for (const row of rows) {
      const done = completion(
        row.batch.course,
        row.lessonProgress,
        row.assessmentSubmissions,
      ).eligible;
      completed += Number(done);
      const course = courses.get(row.batch.courseId) || {
        id: row.batch.courseId,
        title: row.batch.course.title,
        enrollments: 0,
        completed: 0,
      };
      course.enrollments++;
      course.completed += Number(done);
      courses.set(course.id, course);
      const key = periodKey(row.enrolledAt, bucket);
      trend.set(key, (trend.get(key) || 0) + 1);
    }
    return {
      kpis: {
        enrollmentCount: rows.length,
        completionRate: rows.length ? (completed / rows.length) * 100 : 0,
        averageScore: graded.length
          ? graded.reduce((n, row) => n + (row.percentage || 0), 0) /
            graded.length
          : 0,
        activeUsers: new Set(
          active.map((r) => r.enrollment.studentEmail.toLowerCase()),
        ).size,
        attendancePercentage: roster.percentage,
      },
      attendance: roster,
      counts: {
        completedEnrollments: completed,
        gradedAttempts: graded.length,
      },
      definitions: {
        completionRate:
          "Current eligible completions / enrollments created in the date range",
        averageScore:
          "Mean percentage of all graded attempts submitted in the date range, including retakes",
        attendancePercentage:
          "(PRESENT + LATE) / (PRESENT + LATE + ABSENT); EXCUSED excluded; requires client confirmation",
        timezone: "UTC; inclusive start and end dates",
      },
      trend: [...trend]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      courses: [...courses.values()].sort((a, b) => a.id - b.id),
      from,
      to,
      bucket,
    };
  };
}
module.exports = { createAnalytics, attendance, periodKey };
