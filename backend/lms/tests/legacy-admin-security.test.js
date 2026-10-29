const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { errorHandler } = require("../router");

const controllers = {
  courseController: ["getCourses", "getCourseById", "createCourse", "updateCourse", "deleteCourse", "getCourseBatches", "getCourseContent"],
  moduleController: ["getAllModules", "getModuleById", "getModulesByCourseId", "createModule", "updateModule", "deleteModule"],
  lessonController: ["getAllLessons", "getLessonById", "getLessonsByModuleId", "createLesson", "updateLesson", "deleteLesson"],
  batchController: ["getBatches", "getBatchById", "createBatch", "updateBatch", "deleteBatch", "getBatchEnrollments", "autoAllocateStudent"],
  enrollmentController: ["getEnrollments", "getEnrollmentById", "createEnrollment", "updateEnrollment", "unlockCourseAccess", "deleteEnrollment"],
  certificateTemplateController: ["getActiveCertificateTemplate", "getAllCertificateTemplates", "getCertificateTemplateById", "createCertificateTemplate", "updateCertificateTemplate", "deleteCertificateTemplate"],
  assessmentController: ["createCodingQuestion", "getCodingQuestions", "getCodingQuestionById", "updateCodingQuestion", "deleteCodingQuestion", "createCodingTestCase", "getCodingTestCases", "updateCodingTestCase", "deleteCodingTestCase"],
};
const routeFiles = [
  ["/api/courses", "courseRoutes"],
  ["/api/modules", "moduleRoutes"],
  ["/api/lessons", "lessonRoutes"],
  ["/api/batches", "batchRoutes"],
  ["/api/enrollments", "enrollmentRoutes"],
  ["/api/certificate-templates", "certificateTemplateRoutes"],
  ["/api/admin", "adminCodingQuestionRoutes"],
];
// Each request mounts the actual standalone router, not the global LMS guard.
const protectedRoutes = [
  ["post", "/api/courses", "createCourse", { title: "Course", description: "Test course", category: "Test", price: 0, duration: "1 hour" }],
  ["put", "/api/courses/1", "updateCourse", { title: "Updated course" }],
  ["delete", "/api/courses/1", "deleteCourse"],
  ["post", "/api/modules", "createModule", { title: "Module", courseId: 1 }],
  ["put", "/api/modules/1", "updateModule", { title: "Updated module" }],
  ["delete", "/api/modules/1", "deleteModule"],
  ["post", "/api/lessons", "createLesson", { title: "Lesson", moduleId: 1 }],
  ["put", "/api/lessons/1", "updateLesson", { title: "Updated lesson" }],
  ["delete", "/api/lessons/1", "deleteLesson"],
  ["post", "/api/batches/auto-allocate", "autoAllocateStudent", { courseId: 1, studentName: "Learner", studentEmail: "learner@example.invalid" }],
  ["post", "/api/batches", "createBatch", { name: "Batch", courseId: 1, instructorName: "Instructor", capacity: 20, startDate: "2030-01-01", endDate: "2030-02-01" }],
  ["put", "/api/batches/1", "updateBatch", { name: "Updated batch" }],
  ["delete", "/api/batches/1", "deleteBatch"],
  ["post", "/api/enrollments", "createEnrollment", { studentName: "Learner", studentEmail: "learner@example.invalid", batchId: 1 }],
  ["patch", "/api/enrollments/1/course-access", null, { courseAccess: true }],
  ["put", "/api/enrollments/1", "updateEnrollment", { studentName: "Updated learner" }],
  ["delete", "/api/enrollments/1", "deleteEnrollment"],
  ["post", "/api/certificate-templates", "createCertificateTemplate", { name: "Default template" }],
  ["put", "/api/certificate-templates/1", "updateCertificateTemplate", { title: "Certificate of completion" }],
  ["delete", "/api/certificate-templates/1", "deleteCertificateTemplate"],
  ["post", "/api/admin/coding-questions", "createCodingQuestion"],
  ["get", "/api/admin/assessments/1/coding-questions", "getCodingQuestions"],
  ["get", "/api/admin/coding-questions/1", "getCodingQuestionById"],
  ["put", "/api/admin/coding-questions/1", "updateCodingQuestion"],
  ["delete", "/api/admin/coding-questions/1", "deleteCodingQuestion"],
  ["post", "/api/admin/coding-questions/1/test-cases", "createCodingTestCase"],
  ["get", "/api/admin/coding-questions/1/test-cases", "getCodingTestCases"],
  ["put", "/api/admin/coding-test-cases/1", "updateCodingTestCase"],
  ["delete", "/api/admin/coding-test-cases/1", "deleteCodingTestCase"],
];

test("legacy admin routers enforce signed-in database Admin access before validation", async (t) => {
  const secret = "legacy-admin-security-test-secret-not-for-deployment";
  const previousSecret = process.env.ACCESS_TOKEN_SECRET;
  process.env.ACCESS_TOKEN_SECRET = secret;
  const savedCache = new Map();
  const controllerCalls = [];
  const identityReads = [];
  let role = "Admin";
  const db = {
    user: {
      findUnique: async ({ where }) => {
        identityReads.push(where.id);
        return where.id === 7
          ? { id: 7, name: "Test account", email: "account@example.invalid", role }
          : null;
      },
    },
  };
  function remember(filename) {
    if (!savedCache.has(filename)) savedCache.set(filename, require.cache[filename]);
  }
  function stub(modulePath, exports) {
    const filename = require.resolve(modulePath);
    remember(filename);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
  }
  function reload(modulePath) {
    const filename = require.resolve(modulePath);
    remember(filename);
    delete require.cache[filename];
    return require(modulePath);
  }
  t.after(() => {
    if (previousSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = previousSecret;
    for (const [filename, cached] of savedCache) {
      if (cached) require.cache[filename] = cached;
      else delete require.cache[filename];
    }
  });
  stub("../../config/database", db);
  for (const [moduleName, names] of Object.entries(controllers)) {
    stub(`../../controllers/${moduleName}`, Object.fromEntries(names.map((name) => [
      name,
      (req, res) => {
        controllerCalls.push({ name, user: req.user });
        res.status(200).json({ success: true, controller: name });
      },
    ])));
  }
  // Load real strict authentication against the stubbed user lookup. Controller
  // stubs prevent mutations; the real route validators remain in the chain.
  reload("../../middleware/lmsLegacyAccess");
  const app = express();
  app.use(express.json());
  const discovered = [];
  for (const [prefix, file] of routeFiles) {
    const router = reload(`../../routes/${file}`);
    app.use(prefix, router);
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const method of Object.keys(layer.route.methods)) {
        if (method === "get" && file !== "adminCodingQuestionRoutes") continue;
        const routePath = `${prefix}${layer.route.path === "/" ? "" : layer.route.path}`;
        discovered.push(`${method} ${routePath.replace(/:[A-Za-z]+/g, "1")}`);
      }
    }
  }
  app.use(errorHandler);
  assert.deepEqual(discovered.sort(), protectedRoutes.map(([method, path]) => `${method} ${path}`).sort());
  function resetCalls() {
    controllerCalls.length = 0;
    identityReads.length = 0;
  }
  function token(claimedRole) {
    return jwt.sign({ id: 7, role: claimedRole }, secret, { algorithm: "HS256" });
  }
  const cases = [
    { name: "anonymous", databaseRole: "Admin", headers: {}, status: 401, reads: 0 },
    { name: "Learner", databaseRole: "Learner", headers: { Authorization: `Bearer ${token("Learner")}` }, status: 403, reads: 1 },
    { name: "Instructor", databaseRole: "Instructor", headers: { Authorization: `Bearer ${token("Instructor")}` }, status: 403, reads: 1 },
    { name: "forged demo headers", databaseRole: "Admin", headers: { "x-demo-role": "Admin", "x-user-id": "7", "x-role": "ADMIN" }, status: 401, reads: 0 },
    { name: "stale Admin token after database downgrade", databaseRole: "Learner", headers: { Authorization: `Bearer ${token("Admin")}`, "x-demo-role": "Admin" }, status: 403, reads: 1 },
  ];
  for (const scenario of cases) {
    await t.test(`${scenario.name} cannot reach any of the ${protectedRoutes.length} protected routes`, async () => {
      role = scenario.databaseRole;
      for (const [method, path] of protectedRoutes) {
        resetCalls();
        // Bad IDs and bodies prove authorization precedes legacy validators.
        const invalidPath = path.replace(/\/1(?=\/|$)/g, "/invalid");
        const res = await request(app)[method](invalidPath).set(scenario.headers).send({});
        assert.equal(res.status, scenario.status, `${method.toUpperCase()} ${path}`);
        assert.equal(controllerCalls.length, 0, `${path}: controller must not run`);
        assert.equal(identityReads.length, scenario.reads, `${path}: identity lookup count`);
      }
    });
  }
  await t.test("current database Admin reaches real validators/controllers, even with a stale Learner claim", async () => {
    role = "Admin";
    for (const [method, path, controller, body] of protectedRoutes) {
      resetCalls();
      const res = await request(app)[method](path)
        .set("Authorization", `Bearer ${token("Learner")}`)
        .send(body || {});
      assert.equal(res.status, controller ? 200 : 503, `${method.toUpperCase()} ${path}`);
      assert.deepEqual(identityReads, [7]);
      if (controller) {
        assert.equal(res.body.controller, controller);
        assert.equal(controllerCalls.length, 1);
        assert.equal(controllerCalls[0].name, controller);
        assert.equal(controllerCalls[0].user.id, 7);
      } else {
        assert.equal(res.body.code, "PAYMENT_WEBHOOK_REQUIRED");
        assert.equal(controllerCalls.length, 0, "Direct course unlock must not mutate enrollment");
      }
    }
  });
  await t.test("Admin invalid requests still reach the existing validators", async () => {
    role = "Admin";
    for (const path of ["/api/courses", "/api/modules", "/api/lessons", "/api/batches", "/api/enrollments", "/api/certificate-templates"]) {
      resetCalls();
      const res = await request(app).post(path).set("Authorization", `Bearer ${token("Admin")}`).send({});
      assert.equal(res.status, 400, path);
      assert.equal(controllerCalls.length, 0);
    }
    for (const path of ["/api/courses/invalid", "/api/modules/invalid", "/api/lessons/invalid", "/api/batches/invalid", "/api/enrollments/invalid", "/api/certificate-templates/invalid"]) {
      resetCalls();
      const res = await request(app).delete(path).set("Authorization", `Bearer ${token("Admin")}`);
      assert.equal(res.status, 400, path);
      assert.equal(controllerCalls.length, 0);
    }
  });
  await t.test("template router loads with its real dedicated validators", async () => {
    role = "Admin";
    const invalidBodies = [
      { name: "Template", primaryColor: "invalid" },
      { name: "Template", logoUrl: "javascript:alert(1)" },
      { name: "Template", isActive: "true" },
    ];
    for (const body of invalidBodies) {
      resetCalls();
      const res = await request(app).post("/api/certificate-templates")
        .set("Authorization", `Bearer ${token("Admin")}`).send(body);
      assert.equal(res.status, 400);
      assert.equal(controllerCalls.length, 0);
    }
    resetCalls();
    const emptyUpdate = await request(app).put("/api/certificate-templates/1")
      .set("Authorization", `Bearer ${token("Admin")}`).send({ unrelated: true });
    assert.equal(emptyUpdate.status, 400);
    assert.equal(controllerCalls.length, 0);
  });
  await t.test("public course catalogue reads are preserved", async () => {
    for (const [path, controller] of [["/api/courses", "getCourses"], ["/api/courses/1", "getCourseById"]]) {
      resetCalls();
      const res = await request(app).get(path);
      assert.equal(res.status, 200);
      assert.equal(res.body.controller, controller);
      assert.equal(identityReads.length, 0);
    }
  });
});
