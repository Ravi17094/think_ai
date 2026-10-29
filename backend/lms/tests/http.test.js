const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createRouter, canonicalAliases } = require("../router");
function setup(role = "Learner") {
  const env = { ACCESS_TOKEN_SECRET: "test-secret-not-for-deployment" };
  const db = {
    user: {
      findUnique: async () => ({
        id: 1,
        email: "patan@test.invalid",
        role,
        name: "Patan",
      }),
    },
  };
  const service = { profile: async (user) => ({ user }), sync: async () => [] };
  const app = express();
  app.use(express.json());
  const router = createRouter({ db, service, executor: {}, env });
  app.use("/api/lms", router);
  app.use("/api", canonicalAliases(router));
  const token = jwt.sign({ id: 1, role: "Admin" }, env.ACCESS_TOKEN_SECRET);
  return { app, token };
}
test("LMS rejects demo headers without a signed token", async () => {
  const { app } = setup();
  const res = await request(app)
    .get("/api/lms/me")
    .set("x-demo-role", "Admin")
    .set("x-user-id", "1");
  assert.equal(res.status, 401);
});
test("database role prevents forged/stale admin claims from accessing analytics", async () => {
  const { app, token } = setup();
  const res = await request(app)
    .get("/api/lms/analytics")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(res.status, 403);
});
test("authenticated profile uses database identity", async () => {
  const { app, token } = setup();
  const res = await request(app)
    .get("/api/lms/me")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.role, "Learner");
});
test("canonical progress alias executes the same authenticated validator", async () => {
  const { app, token } = setup();
  const invalid = await request(app)
    .post("/api/progress/sync")
    .set("Authorization", `Bearer ${token}`)
    .send({ updates: [] });
  assert.equal(invalid.status, 400);
  const valid = await request(app)
    .post("/api/progress/sync")
    .set("Authorization", `Bearer ${token}`)
    .send({
      updates: [
        {
          lessonId: 1,
          enrollmentId: 1,
          watchedSeconds: 3,
          updatedAt: new Date().toISOString(),
          baseVersion: null,
        },
      ],
    });
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.body.data, []);
});
