const repository = require("./liveRepository");

/**
 * Business logic for the Live Class Studio (self-contained Forum module).
 * Serializes Prisma records into the exact shape the existing Live Class UI
 * consumes. All user identity is derived from the authenticated `user`
 * (attached by the Forum auth middleware) — never trusted from the request.
 */

function serializePoll(poll) {
    if (!poll) return null;
    const options = (poll.options || [])
        .map((option) => ({ id: option.id, text: option.text, votes: option.votes }))
        .filter((option) => option.text.trim().length > 0);
    const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
    return {
        id: poll.id,
        question: poll.question,
        status: poll.status,
        totalVotes,
        createdAt: poll.createdAt ? poll.createdAt.toISOString() : new Date().toISOString(),
        options: options.map((option) => ({
            ...option,
            percent: totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100)
        }))
    };
}

function serializeMessage(message) {
    return {
        id: message.id,
        userId: message.userId,
        userName: message.userName,
        text: message.text,
        timestamp: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString(),
        deleted: Boolean(message.deleted)
    };
}

function serializeSession(session) {
    if (!session) return null;
    return {
        id: session.id,
        title: session.title,
        hostId: session.hostId,
        status: session.status,
        scheduledAt: session.scheduledAt ? session.scheduledAt.toISOString() : null,
        startedAt: session.startedAt ? session.startedAt.toISOString() : null,
        attendees: (session.attendees || []).map((attendee) => ({
            userId: attendee.userId,
            name: attendee.userName,
            online: Boolean(attendee.online),
            muted: Boolean(attendee.muted),
            cameraOn: Boolean(attendee.cameraOn),
            raisedHand: Boolean(attendee.raisedHand)
        })),
        polls: (session.polls || []).map(serializePoll),
        messages: (session.messages || []).map(serializeMessage)
    };
}

function serializeBreakoutRooms(rooms) {
    return (rooms || []).map((room) => ({
        id: room.id,
        name: room.name,
        status: room.status,
        members: (room.members || []).map((member) => ({
            userId: member.userId,
            userName: member.userName
        }))
    }));
}

function assertStringId(value, message) {
    if (typeof value !== "string" || !value.trim()) {
        const error = new Error(message || "A valid id is required");
        error.code = "VALIDATION";
        throw error;
    }
    return value.trim();
}

function getSession(sessionId) {
    const id = assertStringId(sessionId, "Session id is required");
    return repository.getSession(id).then(serializeSession);
}

function getSessionRecord(sessionId) {
    const id = assertStringId(sessionId, "Session id is required");
    return repository.getSession(id);
}

/**
 * Return the default seed session when present, otherwise materialize it.
 * Keeps the existing demo session ("s1") available on first run.
 */
async function ensureSession(sessionId) {
    const id = assertStringId(sessionId, "Session id is required");
    let session = await repository.getSession(id);
    if (!session) {
        session = await repository.upsertSession({
            id,
            title: "React Hooks Deep Dive — Live Class",
            hostId: "u3",
            status: "live"
        });
        await repository.upsertAttendee(id, {
            userId: "u3", userName: "Rahul Verma", online: true, muted: false, cameraOn: true
        });
        await repository.upsertAttendee(id, {
            userId: "u1", userName: "Aarav Sharma", online: true, muted: true, cameraOn: false
        });
    }
    return serializeSession(await repository.getSession(id));
}

function joinSession(sessionId, user) {
    const id = assertStringId(sessionId, "Session id is required");
    const userId = String((user && user.id) || "guest");
    const userName = (user && user.name) || "Guest";
    return ensureSession(id)
        .then(() => repository.upsertAttendee(id, { userId, userName, online: true }))
        .then(() => repository.getSession(id))
        .then(serializeSession);
}

async function updateSessionStatus(sessionId, status, scheduledAt) {
    const id = assertStringId(sessionId, "Session id is required");
    const nextStatus = String(status || "").trim().toLowerCase();
    if (!["scheduled", "live", "ended"].includes(nextStatus)) {
        const error = new Error("Session status must be scheduled, live, or ended");
        error.code = "VALIDATION";
        throw error;
    }

    let parsedSchedule;
    if (scheduledAt !== undefined && scheduledAt !== null && scheduledAt !== "") {
        if (!/^\d{4}-\d{2}-\d{2}T/.test(String(scheduledAt))) {
            const error = new Error("Use a four-digit year in the session date and time");
            error.code = "VALIDATION";
            throw error;
        }
        parsedSchedule = new Date(scheduledAt);
        if (Number.isNaN(parsedSchedule.getTime())) {
            const error = new Error("Choose a valid session date and time");
            error.code = "VALIDATION";
            throw error;
        }
    } else if (nextStatus === "scheduled") {
        const error = new Error("Choose a session date and time before scheduling");
        error.code = "VALIDATION";
        throw error;
    }

    await ensureSession(id);
    return serializeSession(await repository.updateSessionStatus(id, nextStatus, parsedSchedule));
}

function getMessages(sessionId) {
    const id = assertStringId(sessionId, "Session id is required");
    return ensureSession(id).then(() => repository.listMessages(id)).then((messages) => messages.map(serializeMessage));
}

function updateSessionPresence(sessionId, userId, patch) {
    const id = assertStringId(sessionId, "Session id is required");
    const cleanUserId = String(userId || "");
    const safePatch = {};
    ["online", "muted", "cameraOn", "raisedHand"].forEach((key) => {
        if (patch && typeof patch[key] === "boolean") safePatch[key] = patch[key];
    });
    if (!cleanUserId) throw new Error("userId is required");
    if (Object.keys(safePatch).length === 0) return Promise.resolve(null);
    return repository.updateAttendeePresence(id, cleanUserId, safePatch);
}

function sendMessage(sessionId, user, text) {
    const id = assertStringId(sessionId, "Session id is required");
    const cleanText = String(text || "").trim().slice(0, 1000);
    if (!cleanText) {
        const error = new Error("Message text is required");
        error.code = "VALIDATION";
        throw error;
    }
    const userId = String((user && user.id) || "guest");
    const userName = (user && user.name) || "Guest";
    return ensureSession(id)
        .then(() => repository.createMessage(id, { userId, userName, text: cleanText }))
        .then(serializeMessage);
}

function deleteMessage(sessionId, user, messageId) {
    const id = assertStringId(sessionId, "Session id is required");
    const message = Number(messageId);
    if (!Number.isInteger(message) || message <= 0) {
        const error = new Error("Message id must be a positive integer");
        error.code = "VALIDATION";
        throw error;
    }
    return repository.softDeleteMessage(id, message);
}

function createPoll(sessionId, user, { question, options }) {
    const id = assertStringId(sessionId, "Session id is required");
    const cleanQuestion = String(question || "").trim();
    const cleanOptions = Array.isArray(options)
        ? options.map((text) => String(text).trim()).filter(Boolean).slice(0, 6)
        : [];
    if (cleanQuestion.length < 5) {
        const error = new Error("Question must be at least 5 characters");
        error.code = "VALIDATION";
        throw error;
    }
    if (cleanOptions.length < 2) {
        const error = new Error("At least 2 options are required");
        error.code = "VALIDATION";
        throw error;
    }
    return ensureSession(id)
        .then(() => repository.createPoll(id, { question: cleanQuestion, options: cleanOptions }))
        .then(serializePoll);
}

function votePoll(pollId, userId, optionId) {
    const poll = Number(pollId);
    const option = Number(optionId);
    if (!Number.isInteger(poll) || poll <= 0) {
        const error = new Error("Poll id must be a positive integer");
        error.code = "VALIDATION";
        throw error;
    }
    if (!Number.isInteger(option) || option <= 0) {
        const error = new Error("Option id must be a positive integer");
        error.code = "VALIDATION";
        throw error;
    }
    return repository.castVote(poll, String(userId), option).then(serializePoll);
}

function listBreakoutRooms(sessionId) {
    const id = assertStringId(sessionId, "Session id is required");
    return ensureSession(id).then(() => repository.listBreakoutRooms(id)).then(serializeBreakoutRooms);
}

function createBreakoutRoom(sessionId, name) {
    const id = assertStringId(sessionId, "Session id is required");
    const cleanName = String(name || "").trim();
    if (!cleanName) {
        const error = new Error("Room name is required");
        error.code = "VALIDATION";
        throw error;
    }
    return repository.createBreakoutRoom(id, cleanName).then((room) =>
        serializeBreakoutRooms([room])[0]
    );
}

function joinBreakoutRoom(roomId, user) {
    const room = Number(roomId);
    if (!Number.isInteger(room) || room <= 0) {
        const error = new Error("Room id must be a positive integer");
        error.code = "VALIDATION";
        throw error;
    }
    const userId = String((user && user.id) || "guest");
    const userName = (user && user.name) || "Guest";
    return repository.joinBreakoutRoom(room, { userId, userName }).then(() =>
        repository.getBreakoutRoom(room)
    );
}

function leaveBreakoutRoom(roomId, user) {
    const room = Number(roomId);
    if (!Number.isInteger(room) || room <= 0) {
        const error = new Error("Room id must be a positive integer");
        error.code = "VALIDATION";
        throw error;
    }
    const userId = String((user && user.id) || "guest");
    return repository.leaveBreakoutRoom(room, userId).then(() =>
        repository.getBreakoutRoom(room)
    );
}

module.exports = {
    serializeSession,
    serializePoll,
    getSession,
    getSessionRecord,
    ensureSession,
    joinSession,
    updateSessionStatus,
    getMessages,
    sendMessage,
    deleteMessage,
    createPoll,
    votePoll,
    listBreakoutRooms,
    createBreakoutRoom,
    joinBreakoutRoom,
    leaveBreakoutRoom
};
