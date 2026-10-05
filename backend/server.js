const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config();

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const { startWorker } = require("./services/notificationQueueService");
const initSockets = require("./sockets/index");
const initLiveSocket = require("./src/live/liveSocket");

require("./config/db");

// ============================================================
// ROUTE IMPORTS
// ============================================================
const authRoutes = require("./routes/authRoutes");                 
const adminUsersRoutes = require("./routes/adminUsers");            
const roleMatrixRoutes = require("./routes/roleMatrix");            
const courseRoutes = require("./routes/courseRoutes");
const batchRoutes = require("./routes/batchRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const auditLogRoutes = require("./routes/auditLog");
const notificationPreferenceRoutes = require("./routes/notificationPreferences");
const assessmentRoutes = require("./routes/assessmentRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const lessonProgressRoutes = require("./routes/lessonProgressRoutes");
const codeExecutionRoutes = require("./routes/codeExecutionRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const studioRoutes = require("./routes/studioRoutes"); // Live Class Studio Routes
const attendanceRoutes = require("./routes/attendanceRoutes");

const analyticsRoutes = require("./routes/analytics");
const adminCodingQuestionRoutes = require("./routes/adminCodingQuestionRoutes");

// ============================================================
// APP & MIDDLEWARE INITIALIZATION
// ============================================================
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ============================================================
// MONGODB CONNECTION
// ============================================================
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not configured in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((error) => {
    console.error("❌ MongoDB Connection Failed:", error.message);
  });

// ============================================================
// SWAGGER CONFIGURATION
// ============================================================
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Thinkz LMS API",
            version: "1.0.0",
            description: "Course, Batch, Enrollment, Assessment, Code Execution, and Live Studio APIs"
        },
        servers: [
            {
                url: "http://localhost:5000"
            }
        ]
    },
    apis: ["./routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Thinkz LMS Backend Running Successfully"
    });
});

// ============================================================
// API ROUTES MOUNTING
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api/admin", adminCodingQuestionRoutes);
app.use("/api/roles", roleMatrixRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/lesson-progress", lessonProgressRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/code", codeExecutionRoutes);
app.use("/api/sessions", sessionRoutes);
// Legacy Studio routes use MongoDB and a separate authentication contract.
// Keep them isolated so they do not shadow the Prisma-backed Live Studio
// endpoints mounted below through `./src/routes` at `/api/studio`.
app.use("/api/legacy-studio", studioRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationPreferenceRoutes);

// Static Certificates Folder
app.use(
    "/certificates",
    express.static(path.join(__dirname, "generated/certificates"))
);

// Forum module (self-contained: discussions, comments, categories, bookmarks,
// notifications, moderation, live studio). Mounted last on purpose so it can
// never shadow the routes above.
app.use("/api", require("./src/routes"));

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
app.set("io", io);
const socketState = initSockets(io);
initLiveSocket(io);

// Operational endpoint for checking the real-time layer during demos and load
// tests. It exposes counts only, never user details or room membership.
app.get("/ws/status", (req, res) => {
    const rooms = Array.from(socketState.roomMembers.entries()).map(([name, members]) => ({
        name,
        memberCount: members.size,
    }));

    return res.status(200).json({
        success: true,
        data: {
            status: "ready",
            activeConnections: socketState.activeConnections.size,
            activeRooms: rooms.length,
            rooms,
            checkedAt: new Date().toISOString(),
        },
    });
});
// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
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
        message: error.message || "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log("==============================================");
    console.log(`Thinkz LMS Backend running on port ${PORT}`);
    console.log(`Swagger: http://localhost:${PORT}/api-docs`);
    console.log("[socket] Socket.IO attached and listening");
    console.log("==============================================");
});

startWorker();

module.exports = app;
