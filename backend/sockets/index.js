const jwt = require("jsonwebtoken");

const EVENTS = require("./events");
const sessionManager = require("./sessionManager");
const chatManager = require("./chatManager");
const pollManager = require("./pollManager");
const breakoutManager = require("./breakoutManager");

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
const ROOM_EVENT_HISTORY_LIMIT = 100;
const roomEventHistory = new Map();

function emitRoomEvent(io, roomName, event, payload) {
    const entry = { event, payload, timestamp: new Date().toISOString() };
    const history = roomEventHistory.get(roomName) || [];
    history.push(entry);
    roomEventHistory.set(roomName, history.slice(-ROOM_EVENT_HISTORY_LIMIT));
    io.to(roomName).emit(event, payload);
}


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

            prevState.rooms.forEach((roomName) => {
                const missedEvents = roomEventHistory.get(roomName) || [];
                socket.emit(EVENTS.ROOM_EVENTS_REPLAYED, { roomName, events: missedEvents });
            });


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

        // A client can explicitly request events missed while reconnecting.
        // Replay is restricted to rooms the current socket has joined.
        socket.on(EVENTS.ROOM_REPLAY_REQUEST, ({ roomName, after } = {}, ack) => {
            const joinedRooms = activeConnections.get(socket.id)?.rooms;
            if (!roomName || !joinedRooms?.has(roomName)) {
                return ack?.({ ok: false, error: "Join the room before requesting replay" });
            }
            const afterTime = after ? Date.parse(after) : 0;
            const events = (roomEventHistory.get(roomName) || []).filter((entry) =>
                !Number.isFinite(afterTime) || Date.parse(entry.timestamp) > afterTime
            );
            socket.emit(EVENTS.ROOM_EVENTS_REPLAYED, { roomName, events });
            return ack?.({ ok: true, eventCount: events.length });
        });


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
        // CHAT: MESSAGE
        // ------------------------------------------------

        socket.on(EVENTS.CHAT_MESSAGE, (payload, ack) => {
            const { roomName, text } = payload || {};

            if (!roomName || !text || typeof text !== "string") {
                return ack?.({ ok: false, error: "roomName and text are required" });
            }

            const message = chatManager.addMessage(roomName, userId, text);

            emitRoomEvent(io, roomName, EVENTS.CHAT_MESSAGE, message);

            ack?.({ ok: true, message });
        });


        // ------------------------------------------------
        // POLL: CREATE
        // ------------------------------------------------

        socket.on(EVENTS.POLL_CREATE, (payload, ack) => {
            const { roomName, question, options } = payload || {};

            if (!roomName || !question || !Array.isArray(options) || options.length < 2) {
                return ack?.({ ok: false, error: "roomName, question, and at least 2 options are required" });
            }

            const poll = pollManager.createPoll(roomName, question, options);

            emitRoomEvent(io, roomName, EVENTS.POLL_STARTED, {
                pollId: poll.pollId,
                question: poll.question,
                options: poll.options,
                roomName,
                startedAt: poll.startedAt,
            });

            ack?.({ ok: true, pollId: poll.pollId });
        });


        // ------------------------------------------------
        // POLL: VOTE
        // ------------------------------------------------

        socket.on(EVENTS.POLL_VOTE, (payload, ack) => {
            const { roomName, optionIndex } = payload || {};

            const poll = pollManager.castVote(roomName, userId, optionIndex);

            if (!poll) {
                return ack?.({ ok: false, error: "Invalid vote (no active poll, already voted, or bad option)" });
            }

            emitRoomEvent(io, roomName, EVENTS.POLL_RESULTS, {
                pollId: poll.pollId,
                question: poll.question,
                options: poll.options,
                votes: poll.votes,
                roomName,
            });

            ack?.({ ok: true });
        });


        // ------------------------------------------------
        // POLL: END
        // ------------------------------------------------

        socket.on(EVENTS.POLL_ENDED, (payload, ack) => {
            const { roomName } = payload || {};

            const poll = pollManager.endPoll(roomName);

            if (!poll) {
                return ack?.({ ok: false, error: "No active poll for this room" });
            }

            emitRoomEvent(io, roomName, EVENTS.POLL_ENDED, {
                pollId: poll.pollId,
                roomName,
                endedAt: new Date().toISOString(),
            });

            ack?.({ ok: true });
        });


        // ------------------------------------------------
        // BREAKOUT: CREATE
        // ------------------------------------------------

        socket.on(EVENTS.BREAKOUT_CREATE, (payload, ack) => {
            const { roomName, groupCount } = payload || {};

            if (!roomName || !groupCount || groupCount < 1) {
                return ack?.({ ok: false, error: "roomName and groupCount (>=1) are required" });
            }

            const memberSocketIds = Array.from(roomMembers.get(roomName) || []);
            const memberUserIds = memberSocketIds
                .map((sid) => activeConnections.get(sid)?.userId)
                .filter(Boolean);

            const breakout = breakoutManager.createBreakout(roomName, memberUserIds, groupCount);

            emitRoomEvent(io, roomName, EVENTS.BREAKOUT_STARTED, {
                roomName,
                groups: breakout.groups,
                startedAt: breakout.startedAt,
            });

            ack?.({ ok: true, groups: breakout.groups });
        });


        // ------------------------------------------------
        // BREAKOUT: ASSIGN
        // ------------------------------------------------

        socket.on(EVENTS.BREAKOUT_ASSIGN, (payload, ack) => {
            const { roomName, groupName, userId: targetUserId } = payload || {};

            const breakout = breakoutManager.assignUser(roomName, groupName, targetUserId || userId);

            if (!breakout) {
                return ack?.({ ok: false, error: "No active breakout or group not found" });
            }

            emitRoomEvent(io, roomName, EVENTS.BREAKOUT_ASSIGN, {
                roomName,
                groupName,
                userId: targetUserId || userId,
            });

            ack?.({ ok: true, groups: breakout.groups });
        });


        // ------------------------------------------------
        // BREAKOUT: END
        // ------------------------------------------------

        socket.on(EVENTS.BREAKOUT_ENDED, (payload, ack) => {
            const { roomName } = payload || {};

            const breakout = breakoutManager.endBreakout(roomName);

            if (!breakout) {
                return ack?.({ ok: false, error: "No active breakout for this room" });
            }

            emitRoomEvent(io, roomName, EVENTS.BREAKOUT_ENDED, {
                roomName,
                endedAt: new Date().toISOString(),
            });

            ack?.({ ok: true });
        });


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
