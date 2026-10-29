const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createCertificates } = require("../certificates");
const { createRouter } = require("../router");
async function fixture(change = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lms-local-certificate-"));
  const env = { NODE_ENV: "development", LMS_LOCAL_DEVELOPMENT: "true", LMS_CERTIFICATE_STORAGE: "local",
    ACCESS_TOKEN_SECRET: "a-local-test-secret-that-is-more-than-thirty-two-characters", LMS_LOCAL_CERTIFICATE_DIR: root, ...change };
  let cert;
  let creates = 0;
  const jobs = [];
  const db = { certificate: {
    findUnique: async ({ where }) => cert && (where.id === cert.id || where.enrollmentId === cert.enrollmentId) ? cert : null,
    create: async ({ data }) => { creates++; cert = { id: 1, issuedAt: new Date(), ...data }; return cert; },
    update: async ({ data }) => { cert = { ...cert, ...data }; return cert; },
  }, lmsCertificateDelivery: {
    upsert: async ({ create }) => { if (!jobs.length) jobs.push(create); },
    updateMany: async ({ data }) => { if (jobs[0] && ["GENERATE", "PENDING"].includes(jobs[0].status)) Object.assign(jobs[0], data); return { count: 1 }; },
  }, user: { findUnique: async ({ where }) => ({ id: where.id, role: "Learner", email: `learner${where.id}@example.invalid` }) } };
  const service = createCertificates({ db, env, s3: { send: async () => { throw new Error("Local mode must not contact S3"); } },
    sendEmail: async () => { throw new Error("Local mode must not send email"); } });
  const enrollment = { id: 2, courseAccess: true, studentName: "Local Learner", batch: { course: { title: "Local Course" } } };
  return { root, env, db, service, enrollment, jobs, creates: () => creates,
    cleanup: async () => { for (const file of await fs.readdir(root)) await fs.unlink(path.join(root, file)); await fs.rmdir(root); } };
}
test("explicit local mode generates a real PDF once, reuses the certificate and skips cloud/email", async () => {
  const f = await fixture();
  try {
    const cert = await f.service.issue(f.enrollment, { eligible: true, percentage: 100 });
    const repeated = await f.service.issue(f.enrollment, { eligible: true, percentage: 100 });
    assert.equal(f.creates(), 1);
    assert.equal(repeated.certificateNo, cert.certificateNo);
    assert.equal(f.jobs[0].status, "LOCAL_READY");
    const url = new URL(await f.service.downloadUrl(cert), "http://local.invalid");
    const file = await f.service.readLocalPdf(1, url.searchParams.get("token"));
    assert.equal(file.buffer.subarray(0, 5).toString(), "%PDF-");
    assert.ok(file.buffer.length > 1000);
    assert.match(file.filename, /^CERT-[a-f0-9-]+\.pdf$/);
    await f.service.deliver();
  } finally { await f.cleanup(); }
});
test("local generation still requires completion and unlocked enrollment", async () => {
  const f = await fixture();
  try {
    await assert.rejects(f.service.issue(f.enrollment, { eligible: false }), error => error.code === "NOT_ELIGIBLE");
    await assert.rejects(f.service.issue({ ...f.enrollment, courseAccess: false }, { eligible: true }), error => error.code === "PAYMENT_REQUIRED");
    assert.equal(f.creates(), 0);
  } finally { await f.cleanup(); }
});
test("local storage cannot be enabled in production or without the local development flag", async () => {
  for (const change of [{ NODE_ENV: "production" }, { LMS_LOCAL_DEVELOPMENT: "false" }]) {
    const f = await fixture(change);
    try {
      await assert.rejects(f.service.issue(f.enrollment, { eligible: true }), error => error.code === "LOCAL_STORAGE_DISABLED");
      assert.equal(f.creates(), 0);
    } finally { await f.cleanup(); }
  }
});
test("local download rejects expired, tampered, wrong-certificate and regular login tokens", async () => {
  const f = await fixture();
  try {
    const cert = await f.service.issue(f.enrollment, { eligible: true, percentage: 100 });
    const token = new URL(await f.service.downloadUrl(cert), "http://local.invalid").searchParams.get("token");
    const claims = { purpose: "certificate-pdf", certificateId: 1, certificateNo: cert.certificateNo };
    const expired = jwt.sign(claims, f.env.ACCESS_TOKEN_SECRET, { audience: "local-certificate-download", expiresIn: -1 });
    const login = jwt.sign({ id: 1 }, f.env.ACCESS_TOKEN_SECRET);
    for (const invalid of [undefined, token.slice(0, -4) + "aaaa", expired, login]) {
      await assert.rejects(f.service.readLocalPdf(1, invalid), error => error.status === 401);
    }
    await assert.rejects(f.service.readLocalPdf(2, token), error => error.status === 401);
  } finally { await f.cleanup(); }
});
test("mounted PDF download returns PDF only with a valid scoped link; metadata stays authenticated", async () => {
  const f = await fixture();
  try {
    const cert = await f.service.issue(f.enrollment, { eligible: true, percentage: 100 });
    const app = express(); app.use(express.json());
    app.use("/api/lms", createRouter({ db: f.db, env: f.env, executor: {}, service: {
      localCertificateFile: (id, token) => f.service.readLocalPdf(id, token),
      certificate: async user => { if (user.id !== 1) throw Object.assign(new Error("Forbidden"), { status: 403 }); return cert; },
    } }));
    await request(app).get("/api/lms/certificates/1/pdf").expect(401);
    await request(app).get("/api/lms/certificates/1").expect(401);
    await request(app).get("/api/lms/certificates/1").set("Authorization", `Bearer ${jwt.sign({ id: 2 }, f.env.ACCESS_TOKEN_SECRET)}`).expect(403);
    const response = await request(app).get(await f.service.downloadUrl(cert)).expect(200).expect("Content-Type", /application\/pdf/);
    assert.equal(response.body.subarray(0, 5).toString(), "%PDF-");
    assert.equal(response.headers["cache-control"], "private, no-store");
  } finally { await f.cleanup(); }
});
test("missing local files return an actionable error and generation recreates them", async () => {
  const f = await fixture();
  try {
    const cert = await f.service.issue(f.enrollment, { eligible: true, percentage: 100 });
    const token = new URL(await f.service.downloadUrl(cert), "http://local.invalid").searchParams.get("token");
    await fs.unlink(path.join(f.root, `${cert.certificateNo}.pdf`));
    await assert.rejects(f.service.readLocalPdf(1, token), error => error.code === "CERTIFICATE_PENDING");
    await f.service.issue(f.enrollment, { eligible: true, percentage: 100 });
    assert.equal((await f.service.readLocalPdf(1, token)).buffer.subarray(0, 5).toString(), "%PDF-");
  } finally { await f.cleanup(); }
});
test("local development does not silently substitute local files for unconfigured S3", async () => {
  const f = await fixture({ LMS_CERTIFICATE_STORAGE: undefined });
  try {
    await assert.rejects(f.service.issue(f.enrollment, { eligible: true, percentage: 100 }), error => error.code === "STORAGE_NOT_CONFIGURED");
    assert.deepEqual(await fs.readdir(f.root), []);
  } finally { await f.cleanup(); }
});
