const express = require("express");
const rateLimit = require("express-rate-limit");
const { ZodError } = require("zod");
const schemas = require("./schemas");
const { auth, staff } = require("./auth");
const { check } = require("./errors");
const { courseTree } = require("./service");
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError)
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Check the request fields.",
      issues: error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  const known = {
    P2002: [409, "DUPLICATE_RECORD", "Record already exists."],
    P2003: [409, "DEPENDENT_RECORDS", "Related records prevent this change."],
    P2025: [404, "NOT_FOUND", "Record not found."],
    P2034: [409, "RETRY_TRANSACTION", "Please retry the request."],
  };
  const mapped = known[error.code];
  const status = error.status || mapped?.[0] || 500;
  if (status === 500) console.error("[lms]", error.message);
  res.status(status).json({
    success: false,
    code: error.code || mapped?.[1] || "INTERNAL_ERROR",
    message:
      status === 500
        ? "LMS service failed. Please try again."
        : mapped?.[2] || error.message,
  });
}
function createRouter({
  db,
  service,
  executor,
  reportDelivery,
  env = process.env,
}) {
  const router = express.Router();
  // A short-lived, certificate-scoped capability is issued only after the owned metadata read.
  router.get("/certificates/:id/pdf", wrap(async (req, res) => {
    const file = await service.localCertificateFile(schemas.id.parse(req.params.id), req.query.token);
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.type("application/pdf").attachment(file.filename).send(file.buffer);
  }));
  router.use(auth(db, env));
  router.get(
    "/me",
    wrap(async (req, res) => ok(res, await service.profile(req.lmsUser))),
  );
  router.patch(
    "/me",
    wrap(async (req, res) => {
      const { z } = require("zod");
      const data = z
        .object({ name: z.string().trim().min(1).max(100) })
        .parse(req.body);
      ok(
        res,
        await db.user.update({
          where: { id: req.lmsUser.id },
          data,
          select: { id: true, name: true, email: true, role: true },
        }),
      );
    }),
  );
  router.get(
    "/enrollments",
    wrap(async (req, res) => ok(res, await service.enrollments(req.lmsUser))),
  );
  router.get(
    "/courses",
    wrap(async (req, res) => {
      const page = Math.max(1, Number(req.query.page) || 1),
        take = 20;
      ok(
        res,
        await db.course.findMany({
          where: { status: "ACTIVE" },
          orderBy: { id: "asc" },
          skip: (page - 1) * take,
          take,
        }),
      );
    }),
  );
  router.get(
    "/courses/:id/player",
    wrap(async (req, res) =>
      ok(
        res,
        await service.player(req.lmsUser, schemas.id.parse(req.params.id)),
      ),
    ),
  );
  router.get(
    "/enrollments/:enrollmentId/lessons/:lessonId/content",
    wrap(async (req, res) => {
      const { lesson } = await service.lessonAccess(
        req.lmsUser,
        schemas.id.parse(req.params.enrollmentId),
        schemas.id.parse(req.params.lessonId),
      );
      ok(res, lesson);
    }),
  );
  router.get(
    "/enrollments/:enrollmentId/lessons/:lessonId/notes",
    wrap(async (req, res) =>
      ok(
        res,
        await service.note(
          req.lmsUser,
          schemas.id.parse(req.params.enrollmentId),
          schemas.id.parse(req.params.lessonId),
        ),
      ),
    ),
  );
  router.put(
    "/enrollments/:enrollmentId/lessons/:lessonId/notes",
    wrap(async (req, res) =>
      ok(
        res,
        await service.note(
          req.lmsUser,
          schemas.id.parse(req.params.enrollmentId),
          schemas.id.parse(req.params.lessonId),
          schemas.note.parse(req.body).text,
        ),
      ),
    ),
  );
  router.post(
    "/progress/sync",
    wrap(async (req, res) =>
      ok(
        res,
        await service.sync(req.lmsUser, schemas.sync.parse(req.body).updates),
      ),
    ),
  );
  router.post(
    "/assessments/:id/start",
    wrap(async (req, res) =>
      ok(
        res,
        await service.start(
          req.lmsUser,
          schemas.id.parse(req.params.id),
          schemas.start.parse(req.body).enrollmentId,
        ),
        201,
      ),
    ),
  );
  router.post(
    "/assessments/:id/submit",
    wrap(async (req, res) => {
      ok(
        res,
        await service.submit(
          req.lmsUser,
          schemas.id.parse(req.params.id),
          schemas.submit.parse(req.body),
        ),
        202,
      );
      setImmediate(() =>
        service
          .gradePending()
          .catch((e) => console.error("[lms-worker]", e.message)),
      );
    }),
  );
  router.get(
    "/attempts/:id/results",
    wrap(async (req, res) =>
      ok(
        res,
        await service.result(req.lmsUser, schemas.id.parse(req.params.id)),
      ),
    ),
  );
  router.post(
    "/certificates/generate",
    wrap(async (req, res) =>
      ok(
        res,
        await service.generateCertificate(
          req.lmsUser,
          schemas.id.parse(req.body.enrollmentId),
        ),
        201,
      ),
    ),
  );
  router.get(
    "/certificates/:id",
    wrap(async (req, res) =>
      ok(
        res,
        await service.certificate(req.lmsUser, schemas.id.parse(req.params.id)),
      ),
    ),
  );
  router.post(
    "/code/execute",
    rateLimit({
      windowMs: 60000,
      limit: 60,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    wrap(async (req, res) =>
      ok(res, await executor.execute(schemas.execute.parse(req.body))),
    ),
  );
  router.get(
    "/analytics",
    staff,
    wrap(async (req, res) => {
      check(
        ["admin", "superadmin"].includes(req.lmsUser.role.toLowerCase()),
        403,
        "FORBIDDEN",
        "Administrator access required.",
      );
      ok(res, await service.analytics(schemas.dates.parse(req.query)));
    }),
  );
  const adminOnly = (req, res, next) => {
    check(
      ["admin", "superadmin"].includes(req.lmsUser.role.toLowerCase()),
      403,
      "FORBIDDEN",
      "Administrator access required.",
    );
    next();
  };
  router.get(
    "/analytics/export",
    staff,
    adminOnly,
    wrap(async (req, res) => {
      const format = require("zod")
        .z.enum(["csv", "pdf"])
        .parse(req.query.format);
      const data = await service.analytics(schemas.dates.parse(req.query));
      const reports = require("./reports");
      const body =
        format === "csv"
          ? reports.analyticsCsv(data, { env })
          : await reports.analyticsPdf(data, { env });
      res.set("Cache-Control", "private, no-store");
      res
        .attachment(`learning-analytics.${format}`)
        .type(format === "csv" ? "text/csv; charset=utf-8" : "application/pdf")
        .send(body);
    }),
  );
  router.get(
    "/analytics/report-status",
    staff,
    adminOnly,
    wrap(async (req, res) => {
      check(
        reportDelivery,
        503,
        "REPORT_DELIVERY_NOT_CONFIGURED",
        "Report scheduler is not installed.",
      );
      ok(res, await reportDelivery.status());
    }),
  );
  // Staff-only CRUD uses the same PostgreSQL models as the existing web app.
  for (const [name, model, schema] of [
    ["courses", "course", schemas.course],
    ["modules", "module", schemas.module],
    ["lessons", "lesson", schemas.lesson],
  ]) {
    router.get(
      `/admin/${name}`,
      staff,
      wrap(async (req, res) =>
        ok(
          res,
          await db[model].findMany({ take: 100, orderBy: { id: "asc" } }),
        ),
      ),
    );
    router.post(
      `/admin/${name}`,
      staff,
      wrap(async (req, res) =>
        ok(res, await db[model].create({ data: schema.parse(req.body) }), 201),
      ),
    );
    router.patch(
      `/admin/${name}/:id`,
      staff,
      wrap(async (req, res) =>
        ok(
          res,
          await db[model].update({
            where: { id: schemas.id.parse(req.params.id) },
            data: schema.partial().parse(req.body),
          }),
        ),
      ),
    );
    router.delete(
      `/admin/${name}/:id`,
      staff,
      wrap(async (req, res) => {
        const id = schemas.id.parse(req.params.id);
        if (model === "course")
          check(
            (await db.batch.count({ where: { courseId: id } })) === 0,
            409,
            "ENROLLMENTS_EXIST",
            "Archive courses with batches instead of deleting them.",
          );
        ok(res, await db[model].delete({ where: { id } }));
      }),
    );
  }
  router.patch(
    "/admin/assessments/:id/rules",
    staff,
    wrap(async (req, res) => ok(res, await db.assessment.update({
      where: { id: schemas.id.parse(req.params.id) },
      data: schemas.assessmentRules.parse(req.body),
    }))),
  );
  router.get(
    "/admin/courses/:id/hierarchy",
    staff,
    wrap(async (req, res) =>
      ok(
        res,
        await db.course.findUnique({
          where: { id: schemas.id.parse(req.params.id) },
          include: courseTree,
        }),
      ),
    ),
  );
  for (const [path, model, parent] of [
    ["courses", "module", "courseId"],
    ["modules", "lesson", "moduleId"],
  ]) {
    router.put(
      `/admin/${path}/:id/order`,
      staff,
      wrap(async (req, res) => {
        const { z } = require("zod");
        const ids = z.array(schemas.id).max(500).parse(req.body.ids);
        const parentId = schemas.id.parse(req.params.id);
        await db.$transaction(
          async (tx) => {
            const rows = await tx[model].findMany({
              where: { [parent]: parentId },
              select: { id: true },
            });
            check(
              new Set(ids).size === ids.length &&
                rows.length === ids.length &&
                rows.every((row) => ids.includes(row.id)),
              400,
              "INVALID_ORDER",
              "Include every child ID exactly once.",
            );
            for (let order = 0; order < ids.length; order++)
              await tx[model].update({
                where: { id: ids[order] },
                data: { order },
              });
          },
          { isolationLevel: "Serializable" },
        );
        ok(res, { ids });
      }),
    );
  }
  router.get(
    "/admin/enrollments",
    staff,
    wrap(async (req, res) =>
      ok(
        res,
        await db.enrollment.findMany({ take: 100, orderBy: { id: "desc" } }),
      ),
    ),
  );
  router.delete(
    "/admin/enrollments/:id",
    staff,
    wrap(async (req, res) =>
      ok(
        res,
        await db.enrollment.delete({
          where: { id: schemas.id.parse(req.params.id) },
        }),
      ),
    ),
  );
  router.post(
    "/admin/enrollments",
    staff,
    wrap(async (req, res) => {
      const { z } = require("zod");
      // Payment unlock stays with the verified payment webhook; staff cannot silently unlock via this endpoint.
      const data = z
        .object({
          studentName: z.string().min(1).max(100),
          studentEmail: z.string().email(),
          batchId: schemas.id,
        })
        .parse(req.body);
      ok(
        res,
        await db.enrollment.create({ data: { ...data, courseAccess: false } }),
        201,
      );
    }),
  );
  router.patch(
    "/admin/enrollments/:id/status",
    staff,
    wrap(async (req, res) => {
      const { z } = require("zod");
      const status = z
        .enum(["ENROLLED", "SUSPENDED", "CANCELLED", "COMPLETED"])
        .parse(req.body.status);
      ok(
        res,
        await db.enrollment.update({
          where: { id: schemas.id.parse(req.params.id) },
          data: { enrollmentStatus: status },
        }),
      );
    }),
  );
  router.use(errorHandler);
  return router;
}
// Only explicitly listed canonical endpoints are intercepted; unrelated teammate routes continue normally.
function canonicalAliases(router) {
  const aliases = express.Router();
  for (const route of [
    "/progress/sync",
    "/code/execute",
    "/certificates/generate",
    "/assessments/:id/start",
    "/assessments/:id/submit",
  ]) {
    aliases.post(route, (req, res, next) => router(req, res, next));
  }
  return aliases;
}
module.exports = { createRouter, errorHandler, canonicalAliases };
