const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require("./routes/authRoutes");
const adminUsersRoutes = require("./routes/adminUsers");
const roleRoutes = require("./routes/roleMatrix");

const courseRoutes = require("./routes/courseRoutes");
const batchRoutes = require("./routes/batchRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");

const moduleRoutes = require("./routes/moduleRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const lessonProgressRoutes = require("./routes/lessonProgressRoutes");

const certificateRoutes = require("./routes/certificateRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const codeExecutionRoutes = require("./routes/codeExecutionRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const taRoutes = require("./routes/taRoutes");
const instructorControlRoutes = require("./routes/instructorControlRoutes");

const auditLogRoutes = require("./routes/auditLog");
const analyticsRoutes = require("./routes/analytics");

const notificationPreferenceRoutes =
    require("./routes/notificationPreferences");

const adminCodingQuestionRoutes =
    require("./routes/adminCodingQuestionRoutes");

const demoRoutes = require("./routes/demoRoutes");

// Optional broader project routes
const sessionRoutes = require("./routes/sessionRoutes");
// The Prisma Live Studio module supports chat, polls, attendees and breakout
// rooms. The older Mongo-only route only exposed join and polling.
const studioRoutes = require("./src/routes/studioRoutes");

// ============================================================
// SESSION / PASSPORT
// ============================================================

const session = require("express-session");
const passport = require("passport");

require("./config/passport");

// ============================================================
// DATABASE CONFIG
// ============================================================

require("./config/db");

// ============================================================
// APP
// ============================================================

const app = express();

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

app.use(cors());

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(morgan("dev", {
    // Local signed PDF capabilities must not be recorded in URL logs.
    skip: req => /^\/api\/lms\/certificates\/\d+\/pdf(?:\?|$)/.test(req.originalUrl)
}));

// ============================================================
// SESSION
// ============================================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "your_secret_fallback",

        resave: false,

        saveUninitialized: false
    })
);

app.use(passport.initialize());

app.use(passport.session());

// ============================================================
// SWAGGER
// ============================================================

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Thinkz LMS API",
            version: "1.0.0",
            description:
                "Course, Batch, Enrollment, Assessment, Code Execution, Certificate and Live Studio APIs"
        },

        servers: [
            {
                url: "http://localhost:5001"
            }
        ],

        // ====================================================
        // JWT AUTHENTICATION
        // ====================================================

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },

    apis: [
        "./routes/*.js"
    ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
const patanSpec = require('./lms/openapi.json');
Object.assign(swaggerSpec.paths, patanSpec.paths);
swaggerSpec.components.schemas = {...swaggerSpec.components.schemas, ...patanSpec.components.schemas};
swaggerSpec.servers = [{url:'/'}];

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Thinkz LMS Backend Running Successfully"
    });
});

app.get("/health", (req, res) => {
    return res.status(200).json({
        status: "ok",
        service: "think-ai-backend"
    });
});

app.get("/api/health", (req, res) => {
    return res.status(200).json({
        status: "healthy",
        service: "think-ai-backend",
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// API ROUTES
// ============================================================

// Patan LMS routes must be mounted before legacy resource routes.
require("./lms").installLms(app);

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminUsersRoutes);

app.use("/api/admin", adminCodingQuestionRoutes);

app.use("/api/roles", roleRoutes);

app.use("/api/courses", courseRoutes);

app.use("/api/batches", batchRoutes);

app.use("/api/enrollments", enrollmentRoutes);

app.use("/api/modules", moduleRoutes);

app.use("/api/lessons", lessonRoutes);

app.use("/api/lesson-progress", lessonProgressRoutes);

app.use("/api/certificates", certificateRoutes);

app.use("/api/assessments", assessmentRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/ta", taRoutes);
app.use("/api/instructor-controls", instructorControlRoutes);

app.use("/api/code", codeExecutionRoutes);

app.use("/api/sessions", sessionRoutes);

app.use("/api/studio", studioRoutes);

app.use("/api/audit-logs", auditLogRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/notifications", notificationPreferenceRoutes);

app.use("/api/demo", demoRoutes);

// ============================================================
// STATIC CERTIFICATE FILES
// ============================================================

app.use(
    "/certificates",
    express.static(
        path.join(
            __dirname,
            "generated/certificates"
        )
    )
);

// ============================================================
// ADDITIONAL PROJECT ROUTES
// ============================================================

// Forum / Moderation / community routes:
// /api/discussions, /api/comments, /api/categories, /api/bookmarks,
// /api/notifications, /api/moderation, /api/tags, /api/live-studio.
// Content is seeded from the client-provided files under `data/`.
app.use("/api", require("./src/routes"));

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message:
            `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
    console.error("Global error:", error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(error.status || 500).json({
        success: false,
        message:
            error.message ||
            "Internal server error"
    });
});

// ============================================================
// EXPORT
// ============================================================

module.exports = app;
