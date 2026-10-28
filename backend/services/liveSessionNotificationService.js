// ============================================================
// Live Session Notification Service
// ============================================================
// Bridges the real-time session lifecycle (session:started /
// session:ended) to the Notification Center.
//
// Responsibilities (Notification Center module):
//   1. Subscribe/forward session:started for every connected socket.
//   2. Subscribe/forward session:ended for every connected socket.
//   3. Send the appropriate notification payload ("Live class starting
//      now" with a join link / "Recording available" with a summary link).
//   4. Check the user's live-session notification preference.
//   5. Prevent notification delivery when the user has opted out.
//
// Delivery is fan-out: every connected Socket.IO client whose user has not
// opted out receives the event. Because each browser tab opens its own
// socket, a single session event reaches every open tab in real time.
// ============================================================

const { getPreferencesByUserId } = require("./notificationPreferenceService");

// Event names consumed by the Notification Center frontend (must match
// sockets/events.js SESSION_STARTED / SESSION_ENDED).
const SESSION_STARTED_EVENT = "session:started";
const SESSION_ENDED_EVENT = "session:ended";

// Payload discriminators let the client tell a Notification Center toast
// apart from the session-management payload emitted on the same sockets.
const LIVE_START_TYPE = "live-start";
const LIVE_END_TYPE = "live-end";

// Default links used when the session does not expose its own URL.
const DEFAULT_JOIN_BASE = "/live-studio";
const DEFAULT_SUMMARY_BASE = "/learner/live";

// ============================================================
// PREFERENCE CHECK
// ============================================================

/**
 * Whether a user should receive live-session notifications.
 * - No saved preferences        -> enabled (default on)
 * - push channel disabled       -> disabled
 * - categories.liveSessions false -> disabled (opt-out)
 */
function isLiveSessionEnabled(userId) {
    if (userId === undefined || userId === null) {
        return true;
    }

    const prefs = getPreferencesByUserId(userId);

    if (!prefs) {
        return true;
    }

    if (prefs.pushEnabled === false) {
        return false;
    }

    return (prefs.categories && prefs.categories.liveSessions) !== false;
}

// ============================================================
// PAYLOAD BUILDERS
// ============================================================

function sessionTitle(session) {
    return (session && session.title) || "Live class";
}

function sessionIdOf(session) {
    return (session && session.sessionId) || (session && session.id) || "";
}

function buildStartPayload(session) {
    const sessionId = sessionIdOf(session);
    const link = session.joinLink || `${DEFAULT_JOIN_BASE}/${sessionId}`;
    return {
        type: LIVE_START_TYPE,
        sessionId,
        title: sessionTitle(session),
        message: `Live class starting now — ${sessionTitle(session)}`,
        link,
        linkLabel: "Join live class",
        hostId: (session && session.hostId) || null,
        roomName: (session && session.roomName) || null,
        startedAt: (session && session.startedAt) || new Date().toISOString(),
    };
}

function buildEndPayload(session) {
    const sessionId = sessionIdOf(session);
    const link = session.summaryLink || `${DEFAULT_SUMMARY_BASE}/${sessionId}`;
    return {
        type: LIVE_END_TYPE,
        sessionId,
        title: sessionTitle(session),
        message: `Recording available — ${sessionTitle(session)}`,
        link,
        linkLabel: "View summary & recording",
        hostId: (session && session.hostId) || null,
        roomName: (session && session.roomName) || null,
        endedAt: new Date().toISOString(),
        reason: (session && session.reason) || "ended",
    };
}

// ============================================================
// BROADCAST
// ============================================================

/**
 * Fan out a session event to every connected socket belonging to a user who
 * has not opted out of live-session notifications. Returns the list of
 * user ids actually delivered to (useful for tests and metrics).
 */
function broadcastSessionEvent(io, eventName, payload) {
    if (!io || !io.sockets) {
        return [];
    }

    const delivered = [];

    io.sockets.sockets.forEach((socket) => {
        const userId = socket.user && socket.user.id;

        if (userId === undefined || userId === null) {
            return;
        }

        if (!isLiveSessionEnabled(userId)) {
            return;
        }

        socket.emit(eventName, payload);
        delivered.push(userId);
    });

    return delivered;
}

/**
 * Subscribe/forward `session:started` — every enabled, online user receives
 * a "Live class starting now" notification payload with a join link.
 */
function broadcastSessionStarted(io, session) {
    return broadcastSessionEvent(io, SESSION_STARTED_EVENT, buildStartPayload(session));
}

/**
 * Subscribe/forward `session:ended` — every enabled, online user receives a
 * "Recording available" notification payload with a summary link.
 */
function broadcastSessionEnded(io, session) {
    return broadcastSessionEvent(io, SESSION_ENDED_EVENT, buildEndPayload(session));
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    SESSION_STARTED_EVENT,
    SESSION_ENDED_EVENT,
    LIVE_START_TYPE,
    LIVE_END_TYPE,
    isLiveSessionEnabled,
    buildStartPayload,
    buildEndPayload,
    broadcastSessionStarted,
    broadcastSessionEnded,
    broadcastSessionEvent,
};