// Central definition of all real-time event names + payload shapes.
// Import this in index.js and anywhere else that emits/listens, so
// event names are never hardcoded as raw strings.

module.exports = {
  // ---- Room events (already implemented) ----
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_USER_JOINED: 'room:user_joined',
  ROOM_USER_LEFT: 'room:user_left',

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
};