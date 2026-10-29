require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { io } = require("socket.io-client");

async function main() {
  const database = new URL(process.env.DATABASE_URL || "");
  assert.equal(process.env.LMS_LOCAL_DEVELOPMENT, "true", "This check is only for the local launcher environment.");
  assert.equal(database.hostname, "127.0.0.1");
  assert.equal(database.pathname, "/patan_local");
  const base = "http://127.0.0.1:5000";
  const local = path.resolve(__dirname, "../../.local");
  const credentials = fs.readFileSync(path.join(local, "LOCAL_LOGIN.txt"), "utf8");
  const password = credentials.match(/Password for both: (.+)/)[1].trim();
  const checks = [];
  const call = async (route, { token, method = "GET", body, status = 200 } = {}) => {
    const response = await fetch(base + route, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json();
    assert.equal(response.status, status, `${method} ${route}: ${payload.code || payload.message || response.status}`);
    return payload;
  };
  const login = async (email) => (await call("/api/auth/login", { method: "POST", body: { email, password } })).token;
  const learner = await login("patan@local.test");
  const admin = await login("admin@local.test");
  assert.ok(learner && admin);
  checks.push("Real learner and Admin login");
  await call("/api/lms/me", { status: 401 });
  await call("/api/lms/analytics", { token: learner, status: 403 });
  checks.push("Anonymous and learner-to-admin access denied");
  const enrollments = (await call("/api/lms/enrollments", { token: learner })).data;
  assert.ok(enrollments.length);
  const courseId = enrollments[0].batch.course.id;
  const player = (await call(`/api/lms/courses/${courseId}/player`, { token: learner })).data;
  const enrollmentId = player.enrollmentId;
  const lesson = player.course.modules[0].lessons[0];
  const assessment = player.course.modules[0].assessments[0];
  assert.ok(lesson.id && assessment.id);
  const noteRoute = `/api/lms/enrollments/${enrollmentId}/lessons/${lesson.id}/notes`;
  const previousNote = (await call(noteRoute, { token: learner })).data.text;
  await call(noteRoute, { token: learner, method: "PUT", body: { text: "Local live API verification" } });
  assert.equal((await call(noteRoute, { token: learner })).data.text, "Local live API verification");
  await call(noteRoute, { token: learner, method: "PUT", body: { text: previousNote || "" } });
  checks.push("Course loading and PostgreSQL note save/read");
  const attempt = (await call(`/api/lms/assessments/${assessment.id}/start`, { token: learner, method: "POST", body: { enrollmentId }, status: 201 })).data;
  assert.ok(attempt.attemptId);
  assert.ok(!JSON.stringify(attempt).includes('"isCorrect"'));
  const socket = io(base + "/lms", { auth: { token: learner }, transports: ["websocket"], reconnection: false });
  let received;
  let eventTimer;
  try {
    await new Promise((resolve, reject) => {
      eventTimer = setTimeout(() => reject(new Error("Socket connection timed out")), 5000);
      socket.once("connect", () => { clearTimeout(eventTimer); resolve(); });
      socket.once("connect_error", reject);
    });
    const event = new Promise((resolve, reject) => {
      eventTimer = setTimeout(() => reject(new Error("assessment:submitted event timed out")), 5000);
      socket.once("assessment:submitted", (payload) => { clearTimeout(eventTimer); received = payload; resolve(); });
    });
    const answers = attempt.assessment.questions.map((question) => ({ questionId: question.id, selectedOptionId: question.options[0].id }));
    await call(`/api/lms/assessments/${assessment.id}/submit`, { token: learner, method: "POST", status: 202, body: { attemptId: attempt.attemptId, answers, timestamp: new Date().toISOString() } });
    await event;
    assert.ok(received);
  } finally { clearTimeout(eventTimer); socket.disconnect(); }
  const result = (await call(`/api/lms/attempts/${attempt.attemptId}/results`, { token: learner })).data;
  assert.ok(result.status);
  checks.push("Timed assessment, hidden answer keys, submission, grading and live Socket.IO event");
  const analytics = (await call("/api/lms/analytics?bucket=daily", { token: admin })).data;
  assert.ok(analytics);
  checks.push("Admin analytics from persisted data");
  if (!process.env.JUDGE0_URL) {
    const unavailable = await call("/api/lms/code/execute", { token: learner, method: "POST", status: 503, body: { language: "python", sourceCode: "print(42)" } });
    assert.equal(unavailable.code, "EXECUTOR_UNAVAILABLE");
    checks.push("Missing Judge0 returns explicit HTTP 503, without fake execution");
  }
  const report = { date: new Date().toISOString(), environment: "Separate local PostgreSQL development database", externalAdaptersMocked: false, passed: checks, note: "Practice data only. Real Judge0, S3/email and client-content acceptance remain pending." };
  fs.writeFileSync(path.join(local, "live-check.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
