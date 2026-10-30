const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const courseRoutes = require("./routes/courseRoutes");
const batchRoutes = require("./routes/batchRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const authRoutes = require("./routes/authRoutes")
const adminUsers = require("./routes/adminUsers");
const roleRoutes = require("./routes/roleRoutes");
const demoRoutes = require("./routes/demoRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const lessonProgressRoutes = require("./routes/lessonProgressRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const codeExecutionRoutes = require("./routes/codeExecutionRoutes");
const auditLogRoutes = require("./routes/auditLogs");
const analyticsRoutes = require("./routes/analytics");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(morgan("dev"));
const session = require('express-session');
const passport = require('passport');
require('./config/passport');

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_fallback',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(morgan("dev", {
    // Local signed PDF capabilities must not be recorded in URL logs.
    skip: req => /^\/api\/lms\/certificates\/\d+\/pdf(?:\?|$)/.test(req.originalUrl)
}));

// Mount Demo Routes
app.use('/api/demo', demoRoutes);

app.use(
    "/api/audit-logs",
    auditLogRoutes
);

app.use(
    "/api/analytics",
    analyticsRoutes
);

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Thinkz LMS API",
            version: "1.0.0",
            description:
                "Course, Batch, Enrollment, Assessment and Code Execution APIs"
        },

        servers: [
            {
                url: "http://localhost:5000"
            }
        ]
    },

    apis: ["./routes/*.js"]
};

const swaggerSpec =
    swaggerJsdoc(swaggerOptions);
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

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message:
            "Thinkz LMS Backend Running Successfully"
    });
});

// API Routes
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
// The New Routes Anand Requested
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminUsers);
app.use("/api/roles", roleRoutes);
app.use(
    "/certificates",
    express.static(
        path.join(
            __dirname,
            "generated/certificates"
        )
    )
);

app.use(
    "/api/courses",
    courseRoutes
);

app.use(
    "/api/batches",
    batchRoutes
);

app.use(
    "/api/enrollments",
    enrollmentRoutes
);

app.use(
    "/api/modules",
    moduleRoutes
);

app.use(
    "/api/lessons",
    lessonRoutes
);

app.use(
    "/api/lesson-progress",
    lessonProgressRoutes
);

app.use(
    "/api/certificates",
    certificateRoutes
);

app.use(
    "/api/assessments",
    assessmentRoutes
);

app.use(
    "/api/code",
    codeExecutionRoutes
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "think-ai-backend",
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// Export App
// ----------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "think-ai-backend",
    timestamp: new Date().toISOString()
  });
});
// ============================================================
// EXPORT
// ============================================================

module.exports = app;
