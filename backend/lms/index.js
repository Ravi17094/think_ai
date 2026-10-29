const { createService } = require("./service");
const { createExecutor } = require("./executor");
const { createCertificates } = require("./certificates");
const { createRouter, canonicalAliases } = require("./router");
function installLms(app) {
  if (
    process.env.LMS_LOCAL_DEVELOPMENT === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    app.get("/local-practice-media/practice.mp4", (req, res) =>
      res.sendFile(
        require("node:path").join(__dirname, "fixtures/local-practice.mp4"),
      ),
    );
  }
  const db = require("../config/database");
  const executor = createExecutor();
  const certificates = createCertificates({ db });
  const service = createService({
    db,
    executor,
    certificates,
    emit: (userId, event, payload) =>
      app.get("io")?.of("/lms").to(`user:${userId}`).emit(event, payload),
  });
  const reportDelivery = require("./report-delivery").createReportDelivery({
    db,
    analytics: service.analytics,
  });
  app.locals.lmsReportDelivery = reportDelivery;
  const router = createRouter({ db, service, executor, reportDelivery });
  app.use("/api/lms", router);
  // Legacy endpoints expose staff data (answer keys, progress for arbitrary IDs).
  // Learners use the ownership-checked /api/lms routes. Public course metadata
  // and certificate verification remain readable; all other LMS legacy paths
  // require a real login and staff role.
  const { auth, staff } = require("./auth");
  const legacyAuth = auth(db);
  app.use("/api", (req, res, next) => {
    if (
      !/^\/(courses|modules|lessons|lesson-progress|enrollments|assessments|certificates|code)(\/|$)/.test(
        req.path,
      )
    )
      return next();
    if (
      (req.method === "GET" && /^\/courses(?:\/\d+)?\/?$/.test(req.path)) ||
      (req.method === "GET" && req.path.startsWith("/certificates/verify/"))
    )
      return next();
    // These legacy learner routes enforce identity + enrollment/attempt ownership
    // in their router. Internal callbacks use a separate shared-secret check.
    if (
      (req.method === "POST" && /^\/assessments\/[^/]+\/start$/.test(req.path)) ||
      (req.method === "GET" && /^\/assessments\/enrollment\/[^/]+\/status$/.test(req.path)) ||
      (req.method === "POST" && ["/code/run", "/code/submit", "/code/practice-run"].includes(req.path)) ||
      (req.method === "GET" && /^\/code\/submissions\/[^/]+$/.test(req.path)) ||
      (req.method === "PUT" && req.path === "/code/callback")
    ) return next();
    // Canonical learner aliases have their own ownership checks below.
    if (
      req.method === "POST" &&
      (/^\/assessments\/[^/]+\/submit$/.test(req.path) ||
        ["/code/execute", "/certificates/generate"].includes(req.path))
    )
      return next();
    legacyAuth(req, res, (error) =>
      error ? next(error) : staff(req, res, next),
    );
  });
  app.use("/api", canonicalAliases(router));
  app.use("/api", require("./router").errorHandler);
  app.get("/api/lms-openapi.json", (req, res) =>
    res.json(require("./openapi.json")),
  );
  app.locals.lmsService = service;
  return service;
}
function startLmsWorker(app, io) {
  const jwt = require("jsonwebtoken");
  io.of("/lms")
    .use((socket, next) => {
      try {
        const secret =
          process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
        if (!secret) return next(new Error("Auth not configured"));
        const claims = jwt.verify(socket.handshake.auth?.token, secret, {
          algorithms: ["HS256"],
        });
        const id = Number(claims.id ?? claims.userId ?? claims.sub);
        if (!Number.isSafeInteger(id) || id <= 0)
          return next(new Error("Invalid identity"));
        socket.data.userId = id;
        next();
      } catch {
        next(new Error("Authentication required"));
      }
    })
    .on("connection", (socket) => socket.join(`user:${socket.data.userId}`));
  const tick = () =>
    Promise.all([
      app.locals.lmsService
        .gradePending()
        .catch((e) => console.error("[lms-worker]", e.message)),
      app.locals.lmsReportDelivery
        ?.tick()
        .catch((e) => console.error("[lms-reports]", e.message)),
    ]);
  const timer = setInterval(tick, 10000);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
module.exports = { installLms, startLmsWorker };
