const { test } = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const fs = require("node:fs/promises");
const path = require("node:path");
const { periodKey, attendance } = require("../analytics");
const { csvCell, analyticsCsv, analyticsPdf } = require("../reports");
const { previousPeriod, configuration } = require("../report-delivery");
const { loadBranding } = require("../branding");
const { runStress, stats, dockerSample } = require("../stress-runner");
test("weekly and quarterly date boundaries use UTC", () => {
  assert.equal(periodKey("2026-03-31T23:59:59Z", "quarterly"), "2026-Q1");
  assert.equal(periodKey("2026-04-01T00:00:00Z", "quarterly"), "2026-Q2");
  assert.equal(periodKey("2026-10-25T23:59:59Z", "weekly"), "2026-10-19");
  assert.deepEqual(
    previousPeriod(new Date("2026-10-23T09:00:00Z"), "quarterly"),
    { from: "2026-07-01", to: "2026-09-30", key: "quarterly:2026-10-01" },
  );
  assert.equal(
    previousPeriod(new Date("2024-03-01T09:00:00Z"), "monthly").to,
    "2024-02-29",
  );
});
test("unconfigured attendance is unavailable; local fixtures cannot leak into staging", async () => {
  assert.equal((await attendance({}, {})).percentage, null);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "patan-attendance-"));
  const file = path.join(dir, "roster.json");
  try {
    const roster = {
      source: "Explicit test fixture",
      environment: "local-fixture",
      rows: ["PRESENT", "LATE", "ABSENT", "EXCUSED"].map((status, i) => ({
        sessionId: "s",
        userId: String(i),
        date: "2026-10-23",
        status,
      })),
    };
    await fs.writeFile(file, JSON.stringify(roster));
    const result = await attendance(
      { from: "2026-10-23", to: "2026-10-23" },
      { LMS_ATTENDANCE_FILE: file, LMS_LOCAL_DEVELOPMENT: "true" },
    );
    assert.equal(result.eligible, 3);
    assert.equal(result.attended, 2);
    assert.ok(Math.abs(result.percentage - 200 / 3) < 0.000001);
    await assert.rejects(
      attendance({}, { LMS_ATTENDANCE_FILE: file }),
      (e) => e.code === "ATTENDANCE_SOURCE_INVALID",
    );
    roster.rows.push(roster.rows[0]);
    await fs.writeFile(file, JSON.stringify(roster));
    await assert.rejects(
      attendance(
        {},
        { LMS_ATTENDANCE_FILE: file, LMS_LOCAL_DEVELOPMENT: "true" },
      ),
      (e) => e.code === "ATTENDANCE_DUPLICATE",
    );
  } finally {
    await fs.unlink(file);
    await fs.rmdir(dir);
  }
});
test("CSV blocks spreadsheet formulas and preserves quoted course titles", () => {
  assert.equal(csvCell(' =HYPERLINK("evil")'), '"\' =HYPERLINK(""evil"")"');
  const csv = analyticsCsv({
    kpis: { enrollmentCount: 2 },
    courses: [{ id: 1, title: 'Course, "one"', enrollments: 2, completed: 1 }],
    trend: [],
    bucket: "weekly",
    definitions: {},
  });
  assert.ok(csv.includes('"Course, ""one"""'));
  assert.ok(csv.includes('"course","1"'));
});
test("production certificate branding requires actual approved client assets", () => {
  assert.equal(loadBranding({}).approved, false);
  assert.throws(
    () => loadBranding({ NODE_ENV: "production" }),
    (e) => e.code === "BRANDING_NOT_APPROVED",
  );
  assert.equal(configuration({}).enabled, false);
  assert.ok(
    configuration({ LMS_REPORTS_ENABLED: "true" }).missing.includes(
      "LMS_REPORT_RECIPIENTS",
    ),
  );
});
test("20 concurrent runner distributes all languages without treating service errors as latency samples", async () => {
  let active = 0,
    peak = 0;
  const response = await runStress({
    base: "http://localhost:5000/api/lms",
    token: "test-only",
    request: async (url) => {
      if (String(url).includes("/health")) return { ok: true };
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            results: [{ passed: true, statusId: 3, stdout: "42", stderr: "" }],
          },
        }),
      };
    },
  });
  assert.equal(peak, 20);
  assert.equal(response.executionStatus, "PASS");
  for (const value of Object.values(response.stats))
    assert.equal(value.samples, 5);
  assert.equal(
    stats([{ language: "python", passed: false, latencyMs: 3 }]).python.p50Ms,
    null,
  );
});
test("unavailable Judge0 fallback requires friendly errors and a surviving API", async () => {
  const report = await runStress({
    base: "http://localhost:5000/api/lms",
    token: "test-only",
    expectUnavailable: true,
    request: async (url) =>
      String(url).includes("/health")
        ? { ok: true }
        : {
            ok: false,
            status: 503,
            json: async () => ({
              code: "EXECUTOR_UNAVAILABLE",
              message: "Code service unavailable.",
            }),
          },
  });
  assert.equal(report.fallbackVerified, true);
  assert.equal(report.executionStatus, "NOT_RUN");
  await assert.rejects(dockerSample("judge0; rm -rf /"), /Invalid/);
});
test("PDF export accepts long course names and produces a real PDF", async () => {
  const body = await analyticsPdf(
    {
      kpis: { enrollmentCount: 120, attendancePercentage: null },
      courses: Array.from({ length: 40 }, (_, i) => ({
        title: `${i} Long course title with all data retained`,
        enrollments: 3,
        completed: 1,
      })),
      trend: [],
      bucket: "quarterly",
      attendance: { source: "Not configured" },
      definitions: {},
    },
    { env: {} },
  );
  assert.equal(body.subarray(0, 5).toString(), "%PDF-");
  assert.ok(body.length > 2000);
});

test("certificate keeps identity, footer and long text on one landscape page", async () => {
  const { certificatePdf } = require("../certificate-template");
  const body = await certificatePdf(
    {
      studentName: "Patan " + "Long learner name ".repeat(8),
      courseName: "Long course title ".repeat(14),
      issuedAt: new Date("2026-10-23T09:00:00Z"),
      certificateNo: "SAMPLE-layout-regression",
    },
    { env: {}, sample: true },
  );
  assert.equal(
    (body.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
    1,
  );
});
