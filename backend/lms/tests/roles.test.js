const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createRouter } = require("../router");
function setup(initialRole) {
  let role = initialRole;
  const calls = { analytics: 0, reports: 0, courses: 0 };
  const env = { ACCESS_TOKEN_SECRET: "role-tests-only-not-for-deployment" };
  const db = {
    user: {
      findUnique: async () => ({
        id: 1,
        name: "Patan",
        email: "patan@example.invalid",
        role,
      }),
    },
    course: {
      findMany: async () => {
        calls.courses++;
        return [];
      },
      create: async ({ data }) => {
        calls.courses++;
        return { id: 1, ...data };
      },
    },
  };
  const service = {
    analytics: async () => {
      calls.analytics++;
      return {
        kpis: { enrollmentCount: 0 },
        courses: [],
        trend: [],
        definitions: {},
        bucket: "daily",
      };
    },
  };
  const reportDelivery = {
    status: async () => {
      calls.reports++;
      return { enabled: false, configured: false, recent: [] };
    },
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/lms",
    createRouter({ db, service, executor: {}, reportDelivery, env }),
  );
  const token = jwt.sign({ id: 1, role: "Admin" }, env.ACCESS_TOKEN_SECRET);
  const get = (path) =>
    request(app)
      .get("/api/lms" + path)
      .set("Authorization", `Bearer ${token}`);
  return {
    app,
    token,
    get,
    calls,
    setRole: (value) => {
      role = value;
    },
  };
}
for (const role of [
  "Admin",
  "Superadmin",
  "Instructor",
  "Learner",
  "TA",
  "Unknown",
]) {
  test(`${role}: analytics, exports and report status follow the current database role`, async () => {
    const app = setup(role),
      allowed = ["Admin", "Superadmin"].includes(role);
    for (const path of [
      "/analytics",
      "/analytics/export?format=csv",
      "/analytics/export?format=pdf",
      "/analytics/report-status",
    ])
      assert.equal((await app.get(path)).status, allowed ? 200 : 403, path);
    assert.equal(app.calls.analytics, allowed ? 3 : 0);
    assert.equal(app.calls.reports, allowed ? 1 : 0);
  });
  test(`${role}: course administration follows staff permissions`, async () => {
    const app = setup(role),
      allowed = ["Admin", "Superadmin", "Instructor"].includes(role);
    assert.equal((await app.get("/admin/courses")).status, allowed ? 200 : 403);
    const response = await request(app.app)
      .post("/api/lms/admin/courses")
      .set("Authorization", `Bearer ${app.token}`)
      .send({
        title: "Course",
        description: "Description",
        category: "Programming",
        price: 0,
        duration: "1 hour",
      });
    assert.equal(response.status, allowed ? 201 : 403);
    assert.equal(app.calls.courses, allowed ? 2 : 0);
  });
}
test("a stale Admin token loses exports, reports and CRUD immediately after a database downgrade", async () => {
  const app = setup("Admin");
  assert.equal((await app.get("/analytics")).status, 200);
  assert.equal((await app.get("/analytics/report-status")).status, 200);
  app.setRole("Learner");
  for (const path of [
    "/analytics",
    "/analytics/export?format=csv",
    "/analytics/report-status",
    "/admin/courses",
  ])
    assert.equal((await app.get(path)).status, 403, path);
  assert.deepEqual(app.calls, { analytics: 1, reports: 1, courses: 0 });
});
