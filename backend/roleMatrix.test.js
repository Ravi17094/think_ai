const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const roleMatrixRoutes = require("./routes/roleMatrix");

function buildTestApp() {
  const app = express();
  app.use(express.json());
  // Provide the development authentication header understood by requireRole.
  app.use((req, res, next) => {
    req.headers["x-demo-role"] = req.headers["x-demo-role"] || "Admin";
    next();
  });
  app.use("/api/roles", roleMatrixRoutes);
  return app;
}

async function withServer(fn) {
  const app = buildTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = server.address().port;
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/roles/matrix returns roles, permissions, and grants for Admin", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/roles/matrix`, {
      headers: { "x-demo-role": "Admin" },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.roles));
    assert.ok(Array.isArray(body.permissions));
    assert.ok(body.grants);
    assert.ok(body.grants.Admin);
  });
});

test("GET /api/roles/matrix is blocked for non-Admin roles", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/roles/matrix`, {
      headers: { "x-demo-role": "Learner" },
    });
    assert.equal(res.status, 403);
  });
});

test("PATCH /api/roles/:role/permissions/:permission grants a permission", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/roles/Learner/permissions/view_courses`, {
      method: "PATCH",
      headers: { "x-demo-role": "Admin", "Content-Type": "application/json" },
      body: JSON.stringify({ granted: true }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.role, "Learner");
    assert.equal(body.granted, true);
  });
});

test("PATCH /api/roles/:role/permissions/:permission returns 404 for unknown role", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/roles/Nonexistent/permissions/view_courses`, {
      method: "PATCH",
      headers: { "x-demo-role": "Admin", "Content-Type": "application/json" },
      body: JSON.stringify({ granted: true }),
    });
    assert.equal(res.status, 404);
  });
});
