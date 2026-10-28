const test = require("node:test");
const assert = require("node:assert/strict");
const requireRole = require("./middleware/requireRole");

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("requireRole allows a permitted demo role", () => {
  const req = { headers: { "x-demo-role": "TA", "x-demo-user-id": "ta-1" }, originalUrl: "/api/assessments/ta/grading-queue" };
  const res = responseRecorder();
  let called = false;
  requireRole(["TA", "Instructor", "Admin"])(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.user.id, "ta-1");
  assert.equal(req.thinkzAuthenticatedUser.role, "TA");
});

test("requireRole returns a structured forbidden response", () => {
  const req = { headers: { "x-demo-role": "TA", "x-demo-user-id": "ta-1" }, originalUrl: "/api/admin/users" };
  const res = responseRecorder();
  requireRole(["Admin"])(req, res, () => assert.fail("next should not be called"));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "INSUFFICIENT_ROLE");
  assert.deepEqual(res.body.requiredRoles, ["Admin"]);
});

test("requireRole reuses a previously verified identity in the same request", () => {
  const req = { headers: {}, originalUrl: "/api/assessments", thinkzAuthenticatedUser: { id: "admin-1", role: "Admin" } };
  const res = responseRecorder();
  let called = false;
  requireRole(["Instructor"])(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.user.id, "admin-1");
});
