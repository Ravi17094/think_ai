// Real database counterparts of the missing Desktop CRUD/order/enrollment cases.
// Opt in only with an empty dedicated LMS_TEST_DATABASE_URL, never a client database.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { createRouter } = require("../router");
test("PostgreSQL CRUD, multi-sibling hierarchy ordering and enrollment status lifecycle", { skip: !process.env.LMS_TEST_DATABASE_URL }, async () => {
  const db = new PrismaClient({ datasourceUrl: process.env.LMS_TEST_DATABASE_URL });
  const prefix = `desktop-integration-${Date.now()}`;
  const env = { ACCESS_TOKEN_SECRET: "isolated-desktop-db-tests-only" };
  let admin;
  try {
    admin = await db.user.create({ data: { name: "Integration admin", role: "Admin", email: `${prefix}@example.invalid` } });
    const app = express();
    app.use(express.json());
    app.use("/api/lms", createRouter({ db, service: {}, executor: {}, env }));
    const token = jwt.sign({ id: admin.id }, env.ACCESS_TOKEN_SECRET);
    const call = (method, path, body) => request(app)[method](`/api/lms${path}`).set("Authorization", `Bearer ${token}`).send(body);
    const made = await call("post", "/admin/courses", { title: prefix, description: "Course", category: "Coding", price: 0, duration: "1 hour" }).expect(201);
    const courseId = made.body.data.id;
    assert.ok((await call("get", "/admin/courses").expect(200)).body.data.some(row => row.id === courseId));
    await call("patch", `/admin/courses/${courseId}`, { description: "Updated course" }).expect(200);
    assert.equal((await db.course.findUnique({ where: { id: courseId } })).description, "Updated course");
    const modules = [];
    for (const order of [0, 1]) {
      modules.push((await call("post", "/admin/modules", { courseId, title: `Module ${order}`, order }).expect(201)).body.data);
    }
    const lessons = [];
    for (const order of [0, 1]) {
      lessons.push((await call("post", "/admin/lessons", { moduleId: modules[0].id, title: `Lesson ${order}`, durationSeconds: 60, order }).expect(201)).body.data);
    }
    await call("patch", `/admin/modules/${modules[0].id}`, { title: "Updated module" }).expect(200);
    await call("patch", `/admin/lessons/${lessons[0].id}`, { title: "Updated lesson" }).expect(200);
    assert.ok((await call("get", "/admin/modules").expect(200)).body.data.some(row => row.title === "Updated module"));
    assert.ok((await call("get", "/admin/lessons").expect(200)).body.data.some(row => row.title === "Updated lesson"));
    await call("put", `/admin/courses/${courseId}/order`, { ids: [modules[1].id, modules[0].id] }).expect(200);
    await call("put", `/admin/modules/${modules[0].id}/order`, { ids: [lessons[1].id, lessons[0].id] }).expect(200);
    const hierarchy = (await call("get", `/admin/courses/${courseId}/hierarchy`).expect(200)).body.data;
    assert.deepEqual(hierarchy.modules.map(row => row.id), [modules[1].id, modules[0].id]);
    assert.deepEqual(hierarchy.modules[1].lessons.map(row => row.id), [lessons[1].id, lessons[0].id]);
    await call("put", `/admin/courses/${courseId}/order`, { ids: [modules[0].id, modules[0].id] }).expect(400);
    await call("put", `/admin/modules/${modules[1].id}/order`, { ids: [lessons[0].id, lessons[1].id] }).expect(400);
    const batch = await db.batch.create({ data: { courseId, name: prefix, instructorName: "Test", capacity: 10, startDate: new Date(), endDate: new Date(Date.now() + 86400000) } });
    await call("delete", `/admin/courses/${courseId}`).expect(409);
    const enrollment = (await call("post", "/admin/enrollments", { batchId: batch.id, studentName: "Learner", studentEmail: `${prefix}-learner@example.invalid`, courseAccess: true }).expect(201)).body.data;
    assert.equal(enrollment.courseAccess, false);
    for (const status of ["SUSPENDED", "CANCELLED", "ENROLLED", "COMPLETED"]) {
      await call("patch", `/admin/enrollments/${enrollment.id}/status`, { status }).expect(200);
      assert.equal((await db.enrollment.findUnique({ where: { id: enrollment.id } })).enrollmentStatus, status);
    }
    assert.ok((await call("get", "/admin/enrollments").expect(200)).body.data.some(row => row.id === enrollment.id));
    await call("delete", `/admin/enrollments/${enrollment.id}`).expect(200);
    assert.equal(await db.enrollment.findUnique({ where: { id: enrollment.id } }), null);
    await db.batch.delete({ where: { id: batch.id } });
    for (const lesson of lessons) await call("delete", `/admin/lessons/${lesson.id}`).expect(200);
    for (const module of modules) await call("delete", `/admin/modules/${module.id}`).expect(200);
    await call("delete", `/admin/courses/${courseId}`).expect(200);
    assert.equal(await db.course.findUnique({ where: { id: courseId } }), null);
  } finally {
    await db.enrollment.deleteMany({ where: { batch: { course: { title: { startsWith: prefix } } } } });
    await db.batch.deleteMany({ where: { course: { title: { startsWith: prefix } } } });
    await db.course.deleteMany({ where: { title: { startsWith: prefix } } });
    if (admin) await db.user.delete({ where: { id: admin.id } });
    await db.$disconnect();
  }
});
