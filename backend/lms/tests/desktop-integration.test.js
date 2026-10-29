// Contract cases adapted from the Desktop LMS variants, against the current mounted router.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createRouter, canonicalAliases } = require("../router");
function setup(role = "Admin") {
  const env = { ACCESS_TOKEN_SECRET: "desktop-contract-tests-only" };
  const db = { user: { findUnique: async () => ({ id: 1, email: "learner@example.invalid", role }) } };
  for (const model of ["course", "module", "lesson", "enrollment"]) {
    const rows = new Map();
    let id = 0;
    db[model] = {
      rows,
      findMany: async ({ where } = {}) => [...rows.values()].filter(row => !where || Object.entries(where).every(([key, value]) => row[key] === value)),
      create: async ({ data }) => { const row = { id: ++id, ...data }; rows.set(id, row); return row; },
      update: async ({ where, data }) => { const row = { ...rows.get(where.id), ...data }; rows.set(where.id, row); return row; },
      delete: async ({ where }) => { const row = rows.get(where.id); rows.delete(where.id); return row; },
      findUnique: async ({ where }) => rows.get(where.id),
    };
  }
  db.batch = { count: async () => 0 };
  db.$transaction = async action => action(db);
  const executed = [];
  const app = express();
  app.use(express.json());
  const router = createRouter({ db, service: {}, executor: { execute: async input => { executed.push(input); return { language: input.language, results: [] }; } }, env });
  app.use("/api/lms", router);
  app.use("/api", canonicalAliases(router));
  const token = jwt.sign({ id: 1 }, env.ACCESS_TOKEN_SECRET);
  const call = (method, path, body) => request(app)[method](path).set("Authorization", `Bearer ${token}`).send(body);
  return { db, call, executed };
}
for (const [resource, input] of [
  ["courses", { title: "Course", description: "Description", category: "Coding", price: 0, duration: "1 hour" }],
  ["modules", { title: "Module", courseId: 7, order: 0 }],
  ["lessons", { title: "Lesson", moduleId: 9, order: 0, durationSeconds: 60 }],
]) {
  test(`${resource}: create, list, update and delete preserve validated data`, async () => {
    const { call } = setup();
    const prefix = `/api/lms/admin/${resource}`;
    const made = await call("post", prefix, input).expect(201);
    const id = made.body.data.id;
    const list = await call("get", prefix).expect(200);
    assert.equal(list.body.data[0].title, input.title);
    const changed = await call("patch", `${prefix}/${id}`, { title: "Updated" }).expect(200);
    assert.equal(changed.body.data.title, "Updated");
    await call("delete", `${prefix}/${id}`).expect(200);
    assert.deepEqual((await call("get", prefix)).body.data, []);
  });
  test(`${resource}: learner mutation is denied and invalid staff input does not persist`, async () => {
    await setup("Learner").call("post", `/api/lms/admin/${resource}`, input).expect(403);
    const { call } = setup();
    await call("post", `/api/lms/admin/${resource}`, { ...input, title: "" }).expect(400);
    assert.deepEqual((await call("get", `/api/lms/admin/${resource}`)).body.data, []);
  });
}
for (const [path, model, parent] of [["courses", "module", "courseId"], ["modules", "lesson", "moduleId"]]) {
  test(`${path}: reordering two siblings persists order and rejects duplicate or foreign IDs`, async () => {
    const { db, call } = setup();
    await db[model].create({ data: { [parent]: 10, title: "First", order: 0 } });
    await db[model].create({ data: { [parent]: 10, title: "Second", order: 1 } });
    await db[model].create({ data: { [parent]: 11, title: "Other parent", order: 0 } });
    const endpoint = `/api/lms/admin/${path}/10/order`;
    await call("put", endpoint, { ids: [2, 1] }).expect(200);
    assert.equal(db[model].rows.get(2).order, 0);
    assert.equal(db[model].rows.get(1).order, 1);
    for (const ids of [[1, 1], [1], [1, 3]]) await call("put", endpoint, { ids }).expect(400);
    assert.equal(db[model].rows.get(2).order, 0);
  });
}
test("enrollment stays locked on create, validates every supported status and can be deleted", async () => {
  const { call } = setup();
  const prefix = "/api/lms/admin/enrollments";
  const made = await call("post", prefix, { studentName: "Learner", studentEmail: "learner@example.invalid", batchId: 1, courseAccess: true }).expect(201);
  const id = made.body.data.id;
  assert.equal(made.body.data.courseAccess, false);
  for (const status of ["ENROLLED", "SUSPENDED", "CANCELLED", "COMPLETED"]) {
    const changed = await call("patch", `${prefix}/${id}/status`, { status }).expect(200);
    assert.equal(changed.body.data.enrollmentStatus, status);
  }
  await call("patch", `${prefix}/${id}/status`, { status: "APPROVED_BY_CLIENT" }).expect(400);
  await call("delete", `${prefix}/${id}`).expect(200);
  assert.deepEqual((await call("get", prefix)).body.data, []);
});
test("both execution endpoints accept the older snake_case contract and the current camelCase client", async () => {
  const { call, executed } = setup("Learner");
  for (const path of ["/api/lms/code/execute", "/api/code/execute"]) {
    await call("post", path, { language: "python", source_code: "print(42)", test_cases: [{ input: "", expected_output: "42" }], timeout: 30 }).expect(200);
    await call("post", path, { language: "python", sourceCode: "print(42)", testCases: [{ input: "", expectedOutput: "42" }], timeout: 30 }).expect(200);
  }
  assert.equal(executed.length, 4);
  for (const input of executed) assert.equal(input.testCases[0].expectedOutput, "42");
  await call("post", "/api/lms/code/execute", { language: "python", sourceCode: "safe", source_code: "different" }).expect(400);
  await call("post", "/api/lms/code/execute", { language: "python", source_code: "print(1)", timeout: 31 }).expect(400);
  assert.equal(executed.length, 4);
});
