const jwt = require("jsonwebtoken");
const service = require("./liveService");

function authenticateStudioSocket(socket, next) {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    const demoRole = socket.handshake.auth?.demoRole || socket.handshake.query?.demoRole;

    try {
        if (token) {
            const decoded = jwt.verify(String(token).replace("Bearer ", ""), process.env.JWT_SECRET);
            socket.user = {
                id: String(decoded.id || decoded.userId),
                role: decoded.role || "LEARNER",
                name: decoded.name || decoded.email || "Participant",
            };
            return next();
        }

        // Demo identity is limited to non-production local development. A
        // deployed Studio always requires a real JWT.
        if (process.env.NODE_ENV !== "production" && demoRole) {
            socket.user = {
                id: String(socket.handshake.auth?.demoUserId || `demo-${socket.id}`),
                role: demoRole,
                name: socket.handshake.auth?.demoName || "Demo participant",
            };
            return next();
        }

        return next(new Error("Authentication required for Live Studio"));
    } catch (error) {
        return next(new Error("Live Studio authentication failed"));
    }
}

/**
 * Live Class Studio real-time Socket.IO handler (namespace: /studio).
 *
 * Persists to PostgreSQL via the Live service and broadcasts to the room.
 * Keeps the same event names the existing Live Class UI consumes:
 *   session:state, chat:new, poll:update, message:deleted, session:error
 *
 * Identity: the client supplies the current `user` payload (mirroring the
 * existing Forum module). REST remaains the source of truth for voting.
 */
module.exports = function initLiveSocket(io) {
    const namespace = io.of("/studio");
    namespace.use(authenticateStudioSocket);

    namespace.on("connection", (socket) => {
        socket.on("session:join", async ({ sessionId, user } = {}) => {
            try {
                const authenticatedUser = {
                    ...socket.user,
                    name: user?.name || socket.user.name,
                };
                const session = await service.joinSession(sessionId, authenticatedUser);
                if (!session) {
                    socket.emit("session:error", { message: "Session not found" });
                    return;
                }
                socket.join(session.id);
                for (const room of socket.rooms) {
                    if (room !== session.id && room !== socket.id) socket.leave(room);
                }
                namespace.to(session.id).emit("session:state", session);
            } catch (error) {
                socket.emit("session:error", { message: error.message || "Failed to join session" });
            }
        });

        socket.on("chat:send", async ({ sessionId, text, user } = {}) => {
            try {
                const message = await service.sendMessage(sessionId, { ...socket.user, name: user?.name || socket.user.name }, text);
                namespace.to(sessionId).emit("chat:new", message);
            } catch (error) {
                socket.emit("chat:error", { message: error.message || "Failed to send message" });
            }
        });

        socket.on("poll:create", async ({ sessionId, poll, user } = {}) => {
            try {
                const created = await service.createPoll(sessionId, user, poll || {});
                namespace.to(sessionId).emit("poll:update", created);
            } catch (error) {
                socket.emit("poll:error", { message: error.message || "Failed to create poll" });
            }
        });

        socket.on("presence:update", async ({ sessionId, patch } = {}) => {
            try {
                const session = await service.getSessionRecord(sessionId);
                if (!session) return;
                // The same user proceeds as the request sender.
                await service.updateSessionPresence(sessionId, String(socket.user.id), patch);
                const fresh = await service.getSession(sessionId);
                namespace.to(sessionId).emit("session:state", fresh);
            } catch (error) {
                socket.emit("presence:error", { message: error.message || "Presence update failed" });
            }
        });

        socket.on("moderation:deleteMessage", async ({ sessionId, messageId } = {}) => {
            try {
                await service.deleteMessage(sessionId, socket.user, messageId);
                namespace.to(sessionId).emit("message:deleted", { messageId });
                const fresh = await service.getSession(sessionId);
                namespace.to(sessionId).emit("session:state", fresh);
            } catch (error) {
                socket.emit("chat:error", { message: error.message || "Failed to delete message" });
            }
        });

        socket.on("disconnect", () => {
            // Presence flip-off is handled by the client heartbeat; leaving the
            // room here is a no-op because the socket was already disconnected.
        });
    });

    return namespace;
};
