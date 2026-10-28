require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");

const { startWorker } =
    require("./services/notificationQueueService");

const initSockets =
    require("./sockets/index");

const initLiveSocket =
    require("./src/live/liveSocket");

// ============================================================
// HTTP SERVER
// ============================================================

const httpServer = http.createServer(app);

// ============================================================
// SOCKET.IO
// ============================================================

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
        ]
    }
});

// Make Socket.IO available to Express
app.set("io", io);

// Initialize Socket handlers
initSockets(io);
initLiveSocket(io);

// ============================================================
// PORT
// ============================================================

const PORT = process.env.PORT || 5000;

// ============================================================
// START SERVER
// ============================================================

httpServer.listen(
    PORT,
    process.env.HOST || "0.0.0.0",
    () => {
        console.log("==============================================");
        console.log(
            `Thinkz LMS Backend running on port ${PORT}`
        );
        console.log(
            `Swagger: http://localhost:${PORT}/api-docs`
        );
        console.log(
            `Health: http://localhost:${PORT}/api/health`
        );
        console.log(
            "[socket] Socket.IO attached and listening"
        );
        console.log("==============================================");
    }
);

// ============================================================
// NOTIFICATION WORKER
// ============================================================

startWorker();

// ============================================================
// EXPORT
// ============================================================

module.exports = httpServer;