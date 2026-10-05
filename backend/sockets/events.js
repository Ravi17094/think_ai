// Central definition of all real-time event names + payload shapes.
// Import this in index.js and anywhere else that emits/listens, so
// event names are never hardcoded as raw strings.

module.exports = {
  // ---- Room events (already implemented) ----
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_USER_JOINED: 'room:user_joined',
  ROOM_USER_LEFT: 'room:user_left',
  ROOM_REPLAY_REQUEST: 'room:replay',
  ROOM_EVENTS_REPLAYED: 'room:events_replayed',

  // ---- Session events (Session API integration) ----
  SESSION_STARTED: 'session:started',
  // payload: { sessionId, userId, roomName, startedAt }

  SESSION_UPDATED: 'session:updated',
  // payload: { sessionId, userId, roomName, changes: {}, updatedAt }

  SESSION_ENDED: 'session:ended',
  // payload: { sessionId, userId, roomName, endedAt, reason }

  // ---- Presence / activity events ----
  USER_ACTIVITY: 'user:activity',
  // payload: { userId, socketId, action, roomName, timestamp }

  PRESENCE_UPDATE: 'presence:update',
  // payload: { roomName, onlineUsers: [{ userId, socketId }] }

  // ---- Connection lifecycle ----
  CONNECTION_STATE_CHANGED: 'connection:state_changed',
    // payload: { socketId, userId, status: 'connected' | 'disconnected' | 'reconnected', timestamp }

    NOTIFICATION_NEW: 'notification:new',

    // ---- Chat events ----
    CHAT_MESSAGE: 'chat:message',
    // payload: { messageId, userId, roomName, text, sentAt }

    // ---- Poll events ----
    POLL_CREATE: 'poll:create',
    // payload: { question, options: [string], roomName } -> ack returns { pollId }
    POLL_STARTED: 'poll:started',
    // payload: { pollId, question, options, roomName, startedAt }
    POLL_VOTE: 'poll:vote',
    // payload: { pollId, optionIndex, roomName }
    POLL_RESULTS: 'poll:results',
    // payload: { pollId, question, options, votes: { optionIndex: count }, roomName }
    POLL_ENDED: 'poll:ended',
    // payload: { pollId, roomName, endedAt }

    // ---- Breakout room events ----
    BREAKOUT_CREATE: 'breakout:create',
    // payload: { roomName, groupCount } -> ack returns { groups: [{ groupName, members: [] }] }
    BREAKOUT_STARTED: 'breakout:started',
    // payload: { roomName, groups: [{ groupName }], startedAt }
    BREAKOUT_ASSIGN: 'breakout:assign',
    // payload: { roomName, groupName, userId }
    BREAKOUT_ENDED: 'breakout:ended',
    // payload: { roomName, endedAt }
};
