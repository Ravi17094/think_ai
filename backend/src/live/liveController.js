const service = require("./liveService");
const jwt = require("jsonwebtoken");

/**
 * HTTP controllers for the Live Class Studio (self-contained Forum module).
 * Mirrors the response envelope used by the rest of the Forum module:
 *   { success: boolean, message?: string, data?: any }
 * The authenticated user is read from `req.user` (attached by the Forum auth
 * middleware) — never taken from the client.
 */

function isValidationError(error) {
    return error && (error.code === "VALIDATION" || error.code === "OPTION_NOT_FOUND");
}

function handleError(res, error, defaultMessage) {
    if (error && error.code === "OPTION_NOT_FOUND") {
        return res.status(404).json({ success: false, message: "Poll option not found" });
    }
    if (error && error.code === "VALIDATION") {
        return res.status(400).json({ success: false, message: error.message });
    }
    if (error && error.code === "FORBIDDEN") {
        return res.status(403).json({ success: false, message: error.message });
    }
    console.error(defaultMessage, error);
    return res.status(500).json({ success: false, message: defaultMessage });
}

function getSession(req, res) {
    return service
        .ensureSession(req.params.id)
        .then((session) => res.status(200).json({ success: true, data: session }))
        .catch((error) => handleError(res, error, "Failed to load session"));
}

function joinSession(req, res) {
    return service
        .joinSession(req.params.id, req.user)
        .then((session) => res.status(200).json({ success: true, data: session }))
        .catch((error) => handleError(res, error, "Failed to join session"));
}

function canManageSession(user) {
    return ["INSTRUCTOR", "ADMIN"].includes(String(user && user.role || "").toUpperCase());
}

function updateSessionStatus(req, res) {
    if (!canManageSession(req.user)) {
        const error = new Error("Only an Instructor or Admin can schedule, start, or end a live class");
        error.code = "FORBIDDEN";
        return handleError(res, error, "Failed to update session status");
    }
    return service
        .updateSessionStatus(
            req.params.id,
            req.body && req.body.status,
            req.body && req.body.scheduledAt
        )
        .then((session) => {
            const io = req.app.get("io");
            if (io) io.of("/studio").to(req.params.id).emit("session:state", session);
            return res.status(200).json({ success: true, data: session });
        })
        .catch((error) => handleError(res, error, "Failed to update session status"));
}

function createJitsiToken(req, res) {
    const secret = process.env.JITSI_JWT_SECRET;
    const appId = process.env.JITSI_APP_ID;
    const domain = process.env.JITSI_DOMAIN;
    if (!secret || !appId || !domain) {
        return res.status(503).json({ success: false, message: "Jitsi is not configured for this environment" });
    }
    const room = `thinkz-${String(req.params.id).replace(/[^a-z0-9_-]/gi, "-")}`;
    const token = jwt.sign({
        aud: "jitsi", iss: appId, sub: domain, room,
        context: { user: { id: String(req.user.id), name: req.user.name || "Participant" } },
    }, secret, { expiresIn: "10m" });
    return res.status(200).json({ success: true, data: { room, token, expiresInSeconds: 600 } });
}

function getMessages(req, res) {
    return service
        .getMessages(req.params.id)
        .then((data) => res.status(200).json({ success: true, data }))
        .catch((error) => handleError(res, error, "Failed to load messages"));
}

function sendMessage(req, res) {
    return service
        .sendMessage(req.params.id, req.user, req.body && req.body.text)
        .then((message) => res.status(201).json({ success: true, data: message }))
        .catch((error) => handleError(res, error, "Failed to send message"));
}

function deleteMessage(req, res) {
    return service
        .deleteMessage(req.params.id, req.user, req.params.messageId)
        .then(() => res.status(200).json({ success: true, message: "Message deleted" }))
        .catch((error) => handleError(res, error, "Failed to delete message"));
}

function createPoll(req, res) {
    return service
        .createPoll(req.params.id, req.user, req.body || {})
        .then((poll) => res.status(201).json({ success: true, data: poll }))
        .catch((error) => handleError(res, error, "Failed to create poll"));
}

function votePoll(req, res) {
    return service
        .votePoll(req.params.pollId, req.user && req.user.id, req.body && req.body.optionId)
        .then((poll) => {
            if (!poll) return res.status(404).json({ success: false, message: "Poll not found" });
            return res.status(200).json({ success: true, data: poll });
        })
        .catch((error) => handleError(res, error, "Failed to vote on poll"));
}

function getBreakoutRooms(req, res) {
    return service
        .listBreakoutRooms(req.params.id)
        .then((data) => res.status(200).json({ success: true, data }))
        .catch((error) => handleError(res, error, "Failed to load breakout rooms"));
}

function createBreakoutRoom(req, res) {
    return service
        .createBreakoutRoom(req.params.id, req.body && req.body.name)
        .then((room) => res.status(201).json({ success: true, data: room }))
        .catch((error) => handleError(res, error, "Failed to create breakout room"));
}

function joinBreakoutRoom(req, res) {
    return service
        .joinBreakoutRoom(req.params.roomId, req.user)
        .then((room) => {
            if (!room) return res.status(404).json({ success: false, message: "Room not found" });
            return res.status(200).json({ success: true, data: room });
        })
        .catch((error) => handleError(res, error, "Failed to join breakout room"));
}

function leaveBreakoutRoom(req, res) {
    return service
        .leaveBreakoutRoom(req.params.roomId, req.user)
        .then(() => res.status(200).json({ success: true, message: "Left breakout room" }))
        .catch((error) => handleError(res, error, "Failed to leave breakout room"));
}

module.exports = {
    getSession,
    joinSession,
    updateSessionStatus,
    createJitsiToken,
    getMessages,
    sendMessage,
    deleteMessage,
    createPoll,
    votePoll,
    getBreakoutRooms,
    createBreakoutRoom,
    joinBreakoutRoom,
    leaveBreakoutRoom
};
