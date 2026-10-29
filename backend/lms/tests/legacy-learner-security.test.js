const { test, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const backend = path.resolve(__dirname, "../..");
const originalSecret = process.env.ACCESS_TOKEN_SECRET;
process.env.ACCESS_TOKEN_SECRET = "legacy-route-security-test-only";
after(() => {
  if (originalSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
  else process.env.ACCESS_TOKEN_SECRET = originalSecret;
});
let state;
function fixtures() {
  const enrollment = (id, email) => ({
    id, studentEmail: email, courseAccess: true, enrollmentStatus: "ENROLLED",
    batch: { courseId: 4, status: "ACTIVE", course: { status: "ACTIVE" } },
  });
  return {
    role: "Learner", calls: [],
    enrollments: { 11: enrollment(11, "learner7@example.test"), 12: enrollment(12, "learner8@example.test") },
    assessments: {
      21: { id: 21, status: "ACTIVE", duration: 30, module: { courseId: 4 } },
      22: { id: 22, status: "ACTIVE", duration: 30, module: { courseId: 5 } },
    },
    attempts: {
      31: { id: 31, assessmentId: 21, enrollmentId: 11, status: "IN_PROGRESS", startedAt: new Date(), expiresAt: new Date(Date.now() + 600000) },
      32: { id: 32, assessmentId: 21, enrollmentId: 12, status: "IN_PROGRESS", startedAt: new Date(), expiresAt: new Date(Date.now() + 600000) },
    },
    questions: { 41: { id: 41, assessmentId: 21, questionType: "CODING" }, 42: { id: 42, assessmentId: 22, questionType: "CODING" } },
    testCases: { 51: { id: 51, questionId: 41, isHidden: false }, 52: { id: 52, questionId: 41, isHidden: true }, 53: { id: 53, questionId: 42, isHidden: false } },
    payload: { submissionId: 31, score: 1 },
  };
}
beforeEach(() => { state = fixtures(); });
const db = {
  user: { findUnique: async ({ where }) => ({ id: where.id, role: state.role, email: `learner${where.id}@example.test`, name: "Learner" }) },
  enrollment: { findUnique: async ({ where }) => state.enrollments[where.id] || null },
  assessment: { findUnique: async ({ where }) => state.assessments[where.id] || null },
  assessmentSubmission: {
    findUnique: async ({ where }) => state.attempts[where.id] || null,
    findFirst: async ({ where }) => Object.values(state.attempts).find((row) => row.enrollmentId === where.enrollmentId && row.assessmentId === where.assessmentId) || null,
    upsert: async () => { state.calls.push("evaluateCoding"); return { score: 10 }; },
  },
  question: { findUnique: async ({ where }) => state.questions[where.id] || null },
  codingTestCase: { findUnique: async ({ where }) => state.testCases[where.id] || null },
};
const controller = new Proxy({}, {
  get: (_target, name) => (req, res) => {
    state.calls.push(name);
    res.status(200).json({ success: true, operation: name, data: state.payload });
  },
});
const validators = new Proxy({}, { get: () => (_req, _res, next) => next() });
const stubs = new Map([
  [path.join(backend, "config/database"), db],
  [path.join(backend, "controllers/assessmentController"), controller],
  [path.join(backend, "controllers/codeExecutionController"), controller],
  [path.join(backend, "controllers/sessionController"), controller],
  [path.join(backend, "validations/assessmentValidation"), validators],
  [path.join(backend, "validations/codeExecutionValidation"), validators],
  [path.join(backend, "validations/sessionValidation"), validators],
]);
// Stub only persistence, validators, and final handlers. Authentication and all
// route/ownership middleware remain real and are exercised over HTTP.
const originalLoad = Module._load;
let assessmentRouter, codeRouter, sessionRouter;
try {
  Module._load = function (name, parent, ...args) {
    const target = name.startsWith(".") && parent ? path.resolve(path.dirname(parent.filename), name).replace(/\.js$/, "") : "";
    if (stubs.has(target)) return stubs.get(target);
    return originalLoad.call(this, name, parent, ...args);
  };
  assessmentRouter = require("../../routes/assessmentRoutes");
  codeRouter = require("../../routes/codeExecutionRoutes");
  sessionRouter = require("../../routes/sessionRoutes");
} finally { Module._load = originalLoad; }

const app = express();
app.use(express.json());
app.use("/api/assessments", assessmentRouter);
app.use("/api/code", codeRouter);
app.use("/api/v1", sessionRouter);
app.use((error, _req, res, _next) => {
  res.status(error.status || 500).json({ code: error.code || "INTERNAL_ERROR" });
});
const token = (id = 7) => jwt.sign({ id, role: "Admin", email: "forged@example.test" }, process.env.ACCESS_TOKEN_SECRET);
function send(method, url, body = {}, authenticated = true, id = 7) {
  let call = request(app)[method](url).set("x-demo-role", "Admin").set("x-user-role", "Admin");
  if (authenticated) call = call.set("Authorization", `Bearer ${token(id)}`);
  return call.send(body);
}
const adminRoutes = [
  ["post", "/api/assessments"], ["put", "/api/assessments/21"], ["delete", "/api/assessments/21"],
  ["get", "/api/assessments"], ["get", "/api/assessments/21"], ["get", "/api/assessments/21/analytics"], ["get", "/api/assessments/21/submissions"],
  ["post", "/api/assessments/evaluate-coding"],
  ["post", "/api/assessments/admin/coding-questions"], ["get", "/api/assessments/admin/assessments/21/coding-questions"],
  ["get", "/api/assessments/admin/coding-questions/41"], ["put", "/api/assessments/admin/coding-questions/41"], ["delete", "/api/assessments/admin/coding-questions/41"],
  ["post", "/api/assessments/admin/coding-questions/41/test-cases"], ["get", "/api/assessments/admin/coding-questions/41/test-cases"],
  ["put", "/api/assessments/admin/coding-test-cases/51"], ["delete", "/api/assessments/admin/coding-test-cases/51"],
  ["post", "/api/v1/sessions"], ["post", "/api/v1/sessions/1/start"],
];
for (const [method, url] of adminRoutes) {
  test(`${method.toUpperCase()} ${url}: rejects anonymous and non-admin database roles before handler`, async () => {
    assert.equal((await send(method, url, {}, false)).status, 401);
    for (const role of ["Learner", "Instructor", "TA", "Unknown"]) {
      state.role = role;
      assert.equal((await send(method, url)).status, 403, role);
    }
    assert.deepEqual(state.calls, []);
    state.role = "aDmIn";
    assert.equal((await send(method, url)).status, 200);
    assert.equal(state.calls.length, 1);
  });
}
const codeBody = { submissionId: 31, questionId: 41, testCaseId: 51, language: "python", code: "print(1)" };
const learnerRoutes = [
  ["post", "/api/assessments/21/start", { enrollmentId: 11 }],
  ["post", "/api/assessments/21/submit", { enrollmentId: 11, answers: [] }],
  ["get", "/api/assessments/enrollment/11/status", {}],
  ["post", "/api/code/run", codeBody], ["post", "/api/code/submit", codeBody],
  ["get", "/api/code/submissions/31", {}],
  ["post", "/api/code/practice-run", { language: "python", code: "print(1)" }],
];
for (const [method, url, body] of learnerRoutes) {
  test(`${method.toUpperCase()} ${url}: requires a signed learner identity`, async () => {
    assert.equal((await send(method, url, body, false)).status, 401);
    state.role = "Instructor";
    assert.equal((await send(method, url, body)).status, 403);
    assert.deepEqual(state.calls, []);
    state.role = "Learner";
    assert.equal((await send(method, url, body)).status, 200);
    assert.equal(state.calls.length, 1);
  });
  if (!url.endsWith("practice-run"))
    test(`${method.toUpperCase()} ${url}: another learner cannot operate on the owned resource`, async () => {
      assert.equal((await send(method, url, body, true, 8)).status, 403);
      assert.deepEqual(state.calls, []);
    });
}
test("assessment start/submit reject an unrelated course even when the enrollment belongs to the actor", async () => {
  for (const action of ["start", "submit"])
    assert.equal((await send("post", `/api/assessments/22/${action}`, { enrollmentId: 11, answers: [] })).status, 403);
  assert.deepEqual(state.calls, []);
});
test("learner enrollment access must be unlocked and active", async () => {
  for (const mutate of [
    (row) => { row.courseAccess = false; },
    (row) => { row.enrollmentStatus = "CANCELLED"; },
    (row) => { row.batch.status = "CANCELLED"; },
    (row) => { row.batch.course.status = "ARCHIVED"; },
  ]) {
    state = fixtures();
    mutate(state.enrollments[11]);
    assert.equal((await send("post", "/api/assessments/21/start", { enrollmentId: 11 })).status, 403);
  }
  assert.deepEqual(state.calls, []);
});
test("assessment submit needs an existing active attempt and cannot select a different attempt", async () => {
  delete state.attempts[31];
  assert.equal((await send("post", "/api/assessments/21/submit", { enrollmentId: 11 })).status, 409);
  state = fixtures();
  assert.equal((await send("post", "/api/assessments/21/submit", { enrollmentId: 11, attemptId: 32 })).status, 403);
  assert.deepEqual(state.calls, []);
});
test("closed and expired attempts cannot be submitted or used for code grading", async () => {
  for (const change of [
    (attempt) => { attempt.status = "GRADED"; },
    (attempt) => { attempt.expiresAt = new Date(Date.now() - 60000); },
  ]) {
    state = fixtures();
    change(state.attempts[31]);
    assert.equal((await send("post", "/api/assessments/21/submit", { enrollmentId: 11 })).status, 409);
    for (const route of ["run", "submit"])
      assert.equal((await send("post", `/api/code/${route}`, codeBody)).status, 409);
    assert.deepEqual(state.calls, []);
  }
});
test("code question, public test case, and assessment must belong to the same owned attempt", async () => {
  for (const [route, body] of [
    ["run", { ...codeBody, questionId: 42 }],
    ["submit", { ...codeBody, questionId: 42 }],
    ["run", { ...codeBody, testCaseId: 52 }],
    ["run", { ...codeBody, testCaseId: 53 }],
    ["submit", { ...codeBody, enrollmentId: 12 }],
  ]) assert.equal((await send("post", `/api/code/${route}`, body)).status, 403);
  state.attempts[31].assessmentId = 22;
  assert.equal((await send("get", "/api/code/submissions/31")).status, 403);
  assert.deepEqual(state.calls, []);
});
test("owned result responses never expose answer keys or hidden test input/output", async () => {
  state.payload = {
    score: 3, expectedOutput: "answer-key", questions: [{ isCorrect: true, explanation: "answer", codingTestCases: [{ input: "hidden" }] }],
    results: [{ isHidden: true, stdin: "secret", stdout: "secret", actualOutput: "secret", expectedOutput: "secret", passed: true }, { isHidden: false, stdout: "public" }],
  };
  const response = await send("get", "/api/code/submissions/31");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.score, 3);
  assert.deepEqual(response.body.data.questions, [{}]);
  assert.deepEqual(response.body.data.results[0], { isHidden: true, passed: true });
  assert.equal(response.body.data.results[1].stdout, "public");
  assert.ok(!JSON.stringify(response.body).includes("secret"));
  assert.ok(!JSON.stringify(response.body).includes("answer-key"));
});
test("session start has one protected registration and GET session routes keep existing behavior", async () => {
  const starts = sessionRouter.stack.filter((layer) => layer.route?.path === "/sessions/:id/start");
  assert.equal(starts.length, 1);
  assert.equal((await send("get", "/api/v1/sessions", {}, false)).status, 200);
  assert.equal((await send("get", "/api/v1/sessions/1/join-token", {}, false)).status, 200);
});
for (const [method, route, envName, header, handlerName] of [
  ["put", "/api/code/callback", "JUDGE0_CALLBACK_SECRET", "x-judge0-callback-secret", "gradingCallback"],
  ["post", "/api/v1/sessions/callback/recording", "RECORDING_CALLBACK_SECRET", "x-recording-callback-secret", "saveRecordingCallback"],
]) {
  test(`${route}: route registration enforces dedicated callback credentials before the controller`, async () => {
    const original = process.env[envName];
    const secret = "callback-route-test-only-secret-at-least-32-chars";
    try {
      process.env[envName] = secret;
      assert.equal((await send(method, route)).status, 401, "even an authenticated user cannot call the webhook");
      assert.equal((await request(app)[method](route).set(header, secret.slice(0, -1) + "X").send({})).status, 401);
      assert.deepEqual(state.calls, []);
      assert.equal((await request(app)[method](route).set(header, secret).send({})).status, 200);
      assert.deepEqual(state.calls, [handlerName]);
      delete process.env[envName];
      assert.equal((await request(app)[method](route).set(header, secret).send({})).status, 503);
      assert.deepEqual(state.calls, [handlerName]);
    } finally {
      if (original === undefined) delete process.env[envName];
      else process.env[envName] = original;
    }
  });
}
