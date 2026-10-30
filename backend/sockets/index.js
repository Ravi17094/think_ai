const jwt = require("jsonwebtoken");

const EVENTS = require("./events");
const sessionManager = require("./sessionManager");

// Notification Center: forwards the live-session lifecycle to every
// connected socket whose user has live-session notifications enabled.
// TEMPORARILY DISABLED:
// liveSessionNotificationService is referenced by current source but the
// service file is not present in the repository.

const disconnectedUsers = new Map();
// userId -> { rooms, disconnectedAt, timeoutHandle }

const RECONNECT_GRACE_MS = 30000;

// socketId -> { userId, role, rooms, connectedAt }
const activeConnections = new Map();

// roomName -> Set of socketIds
const roomMembers = new Map();

// socketId -> { count, windowStart }
const activityRateLimits = new Map();

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10000;


module.exports = function (io) {

    // ----------------------------------------------------
    // AUTH MIDDLEWARE
    // ----------------------------------------------------

    io.use((socket, next) => {

        try {

            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization;

            const demoRole =
                socket.handshake.headers?.["x-demo-role"] ||
                socket.handshake.query?.["x-demo-role"];

            if (token) {

                const decoded = jwt.verify(
                    token.replace("Bearer ", ""),
                    process.env.JWT_SECRET
                );

                socket.user = {
                    id: decoded.id || decoded.userId,
                    role: decoded.role
                };

            } else if (demoRole) {

                const demoUserId =
                    socket.handshake.headers?.["x-demo-user-id"] ||
                    socket.handshake.query?.["x-demo-user-id"] ||
                    `demo-${socket.id}`;

                socket.user = {
                    id: demoUserId,
                    role: demoRole
                };

            } else {

                return next(
                    new Error(
                        "Authentication required: no token or demo role provided"
                    )
                );
            }

            next();

        } catch (err) {

            next(
                new Error(
                    "Authentication failed: " +
                    err.message
                )
            );
        }
    });


    // ----------------------------------------------------
    // CONNECTION
    // ----------------------------------------------------

    io.on("connection", (socket) => {

        const {
            id: userId,
            role
        } = socket.user;


        // ------------------------------------------------
        // RECONNECTION
        // ------------------------------------------------

        if (disconnectedUsers.has(userId)) {

            const prevState =
                disconnectedUsers.get(userId);

            clearTimeout(
                prevState.timeoutHandle
            );

            disconnectedUsers.delete(userId);


            // Restore previous rooms

            prevState.rooms.forEach(
                (roomName) => {

                    socket.join(roomName);

                    if (
                        !roomMembers.has(roomName)
                    ) {
                        roomMembers.set(
                            roomName,
                            new Set()
                        );
                    }

                    roomMembers
                        .get(roomName)
                        .add(socket.id);


                    socket
                        .to(roomName)
                        .emit(
                            EVENTS.ROOM_USER_JOINED,
                            {
                                userId,
                                socketId: socket.id,
                                roomName,
                                reconnected: true
                            }
                        );
                }
            );


            activeConnections.set(
                socket.id,
                {
                    userId,
                    role,
                    rooms:
                        new Set(prevState.rooms),
                    connectedAt:
                        new Date().toISOString()
                }
            );


            socket.emit(
                EVENTS.CONNECTION_STATE_CHANGED,
                {
                    socketId: socket.id,
                    userId,
                    status: "reconnected",
                    timestamp:
                        new Date().toISOString()
                }
            );


            console.log(
                `[socket] RECONNECTED: ${socket.id} ` +
                `(user=${userId}) — restored ` +
                `${prevState.rooms.size} room(s)`
            );

        } else {

            activeConnections.set(
                socket.id,
                {
                    userId,
                    role,
                    rooms: new Set(),
                    connectedAt:
                        new Date().toISOString()
                }
            );


            console.log(
                `[socket] connected: ${socket.id} ` +
                `(user=${userId}, role=${role})`
            );
        }


        // ------------------------------------------------
        // ROOM: JOIN
        // ------------------------------------------------

        socket.on(
            EVENTS.ROOM_JOIN,
            (roomName, ack) => {

                if (
                    !roomName ||
                    typeof roomName !== "string"
                ) {

                    return ack?.({
                        ok: false,
                        error: "Invalid room name"
                    });
                }


                socket.join(roomName);


                activeConnections
                    .get(socket.id)
                    ?.rooms.add(roomName);


                if (
                    !roomMembers.has(roomName)
                ) {

                    roomMembers.set(
                        roomName,
                        new Set()
                    );
                }


                roomMembers
                    .get(roomName)
                    .add(socket.id);


                socket
                    .to(roomName)
                    .emit(
                        EVENTS.ROOM_USER_JOINED,
                        {
                            userId,
                            socketId: socket.id,
                            roomName
                        }
                    );


                const session =
                    sessionManager.startSession(
                        userId,
                        roomName
                    );


                socket.emit(
                    EVENTS.SESSION_STARTED,
                    session
                );


                // Notification Center: fan out "Live class starting now"
                // to every enabled, online user (one socket per tab, so all
                // open tabs receive it in real time).

                // TEMPORARILY DISABLED:
                // Live-session start notification requires the missing
                // liveSessionNotificationService.


                ack?.({
                    ok: true,
                    roomName,
                    memberCount:
                        roomMembers
                            .get(roomName)
                            .size
                });


                console.log(
                    `[socket] ${socket.id} ` +
                    `joined room "${roomName}"`
                );
            }
        );


        // ------------------------------------------------
        // ROOM: LEAVE
        // ------------------------------------------------

        socket.on(
            EVENTS.ROOM_LEAVE,
            (roomName, ack) => {

                socket.leave(roomName);


                activeConnections
                    .get(socket.id)
                    ?.rooms.delete(roomName);


                roomMembers
                    .get(roomName)
                    ?.delete(socket.id);


                socket
                    .to(roomName)
                    .emit(
                        EVENTS.ROOM_USER_LEFT,
                        {
                            userId,
                            socketId: socket.id,
                            roomName
                        }
                    );


                const userSessions =
                    sessionManager
                        .getSessionsForUser(userId)
                        .filter(
                            (session) =>
                                session.roomName ===
                                roomName
                        );


                userSessions.forEach(
                    (session) => {

                        const ended =
                            sessionManager.endSession(
                                session.sessionId,
                                "left_room"
                            );


                        socket.emit(
                            EVENTS.SESSION_ENDED,
                            ended
                        );


                        // Notification Center: fan out "Recording available"
                        // (with summary link) to every enabled user.

                        // TEMPORARILY DISABLED:
                        // Live-session end notification requires the missing
                        // liveSessionNotificationService.
                    }
                );


                ack?.({
                    ok: true,
                    roomName
                });


                console.log(
                    `[socket] ${socket.id} ` +
                    `left room "${roomName}"`
                );
            }
        );


        // ------------------------------------------------
        // USER ACTIVITY
        // ------------------------------------------------

        socket.on(
            EVENTS.USER_ACTIVITY,
            (payload) => {

                const {
                    roomName,
                    action
                } = payload || {};


                if (
                    !roomName ||
                    !action
                ) {
                    return;
                }


                // Rate limiting

                const now = Date.now();

                const limit =
                    activityRateLimits.get(
                        socket.id
                    ) || {
                        count: 0,
                        windowStart: now
                    };


                if (
                    now -
                    limit.windowStart >
                    RATE_LIMIT_WINDOW_MS
                ) {

                    limit.count = 0;
                    limit.windowStart = now;
                }


                limit.count++;

                activityRateLimits.set(
                    socket.id,
                    limit
                );


                if (
                    limit.count >
                    RATE_LIMIT_MAX
                ) {

                    return;
                }


                // Broadcast activity

                socket
                    .to(roomName)
                    .emit(
                        EVENTS.USER_ACTIVITY,
                        {
                            userId,
                            socketId: socket.id,
                            roomName,
                            action,
                            timestamp: now
                        }
                    );


                // Update session

                const userSessions =
                    sessionManager
                        .getSessionsForUser(userId)
                        .filter(
                            (session) =>
                                session.roomName ===
                                roomName
                        );


                userSessions.forEach(
                    (session) => {

                        sessionManager.updateSession(
                            session.sessionId,
                            {
                                lastAction: action
                            }
                        );
                    }
                );
            }
        );


        // ------------------------------------------------
        // DISCONNECT
        // ------------------------------------------------

        socket.on(
            "disconnect",
            (reason) => {

                const conn =
                    activeConnections.get(
                        socket.id
                    );


                if (conn) {

                    // Remove socket from rooms
                    // immediately

                    conn.rooms.forEach(
                        (roomName) => {

                            roomMembers
                                .get(roomName)
                                ?.delete(socket.id);
                        }
                    );


                    // Start reconnect grace period

                    const timeoutHandle =
                        setTimeout(
                            () => {

                                conn.rooms.forEach(
                                    (roomName) => {

                                        socket
                                            .to(roomName)
                                            .emit(
                                                EVENTS.ROOM_USER_LEFT,
                                                {
                                                    userId,
                                                    socketId:
                                                        socket.id,
                                                    roomName
                                                }
                                            );
                                    }
                                );


                                disconnectedUsers.delete(
                                    userId
                                );


                                console.log(
                                    `[socket] grace period ` +
                                    `expired for user=${userId} ` +
                                    `— fully removed`
                                );

                            },
                            RECONNECT_GRACE_MS
                        );


                    disconnectedUsers.set(
                        userId,
                        {
                            rooms:
                                new Set(conn.rooms),
                            disconnectedAt:
                                new Date().toISOString(),
                            timeoutHandle
                        }
                    );
                }


                activityRateLimits.delete(
                    socket.id
                );


                activeConnections.delete(
                    socket.id
                );


                console.log(
                    `[socket] disconnected: ` +
                    `${socket.id} ` +
                    `(reason: ${reason}) ` +
                    `— grace period started`
                );
            }
        );
    });


    // ----------------------------------------------------
    // EXPOSE STATE
    // ----------------------------------------------------

    return {
        activeConnections,
        roomMembers
    };
};