/**
 * Forum real-time Socket.IO namespace (Phase 8/9 / E2E Validation).
 *
 * The `/forum` namespace delivers live events for the community module:
 *   notification:new   -> a mention / reply / moderation notification was created
 *   moderation:update  -> a hide / ban / unban / warn / mute / dismiss happened
 *   discussion:new     -> a new thread was created (list refresh without reload)
 *   bookmark:changed   -> bookmark state changed for a user
 *
 * Clients join a per-user room (`user:<id>`) on connect so events can be
 * delivered only to the recipient who is online.
 *
 * When no Socket.IO server has been attached (e.g. during unit tests) the
 * push helpers degrade silently to no-ops so the REST layer never breaks.
 */

let ioRef = null;

/** Stores the Socket.IO server instance once the namespace is initialised. */
function setIo(io) {
    ioRef = io;
}

function getIo() {
    return ioRef;
}

function resolveUserId(handshake) {
    const { userId, auth } = handshake || {};
    const fromAuth = (auth && (auth.userId || (auth.user && auth.user && auth.user.id))) || "";
    return String(userId || fromAuth || "u1");
}

/**
 * Broadcasts a freshly created notification to the recipient's room.
 * Used by the REST controllers so real-time toasts reach online clients.
 */
function pushNotification(notification) {
    if (!ioRef || !notification) return;
    ioRef
        .of("/forum")
        .to(`user:${notification.userId}`)
        .emit("notification:new", notification);
}

/**
 * Broadcasts a moderation state change to every connected moderator so the
 * dashboard can update the flagged queue / user list without a refresh.
 */
function pushModerationUpdate(payload) {
    if (!ioRef || !payload) return;
    ioRef.of("/forum").emit("moderation:update", payload);
}

/** Broadcasts a newly created thread so the forum list can refresh live. */
function pushDiscussionNew(discussion) {
    if (!ioRef || !discussion) return;
    ioRef.of("/forum").emit("discussion:new", discussion);
}

/** Broadcasts a bookmark toggle for a single user's room. */
function pushBookmarkChanged({ userId, discussionId, bookmarked }) {
    if (!ioRef) return;
    ioRef
        .of("/forum")
        .to(`user:${userId}`)
        .emit("bookmark:changed", { userId, discussionId, bookmarked });
}

/**
 * Boots the `/forum` namespace. Mirrors the existing `chatSocket.js` pattern
 * so it can be wired in `server.js` with a single line.
 */
function initForumSocket(io) {
    setIo(io);

    const namespace = io.of("/forum");

    namespace.on("connection", (socket) => {
        const userId = resolveUserId(socket.handshake);
        socket.join(`user:${userId}`);
        socket.emit("forum:connected", { userId, ready: true });

        // Demo identity switch — move the socket to the new user's room.
        socket.on("user:join", (nextUserId) => {
            const targetId = String(nextUserId || "u1");
            for (const room of socket.rooms) {
                if (room.startsWith("user:")) socket.leave(room);
            }
            socket.join(`user:${targetId}`);
            socket.emit("forum:connected", { userId: targetId, ready: true });
        });
    });

    return namespace;
}

module.exports = {
    initForumSocket,
    setIo,
    getIo,
    pushNotification,
    pushModerationUpdate,
    pushDiscussionNew,
    pushBookmarkChanged
};