import { io } from "socket.io-client";
import { FORUM_API_BASE_URL } from "./forumHttpClient";

/**
 * Live Class Studio WebSocket service (Phase 6 mock-first, Phase 7 real).
 *
 * Connects to the backend Socket.IO namespace `/studio`. When the backend is
 * unreachable the service transparently falls back to an in-browser mock so
 * the studio UI keeps working in development and tests.
 */

export const STUDIO_EVENTS = {
  STATE: "session:state",
  JOIN: "session:join",
  CHAT_NEW: "chat:new",
  CHAT_SEND: "chat:send",
  POLL_UPDATE: "poll:update",
  POLL_CREATE: "poll:create",
  PRESENCE: "presence:update",
  MESSAGE_DELETED: "message:deleted",
  DELETE_MESSAGE: "moderation:deleteMessage",
};

function resolveServerUrl() {
  if (import.meta.env.VITE_FORUM_WS_URL) return import.meta.env.VITE_FORUM_WS_URL;
  try {
    return new URL(FORUM_API_BASE_URL).origin;
  } catch {
    return "http://localhost:5000";
  }
}

/** In-browser mock used when no live backend is available. */
class MockStudioSocket {
  constructor({ sessionId }) {
    this.mode = "mock";
    this.sessionId = sessionId;
    this.handlers = new Map();
    this.connected = false;
    this._timer = null;
  }

  _emitToUi(event, payload) {
    (this.handlers.get(event) || []).forEach((fn) => fn(payload));
  }

  connect() {
    this.connected = true;
    setTimeout(() => {
      this._emitToUi("mock:connected", { mode: "mock" });
      // Simulated presence churn keeps online indicators alive in mock mode.
      this._timer = setInterval(() => {
        this._emitToUi("mock:heartbeat", { at: Date.now() });
      }, 15000);
    }, 120);
    return this;
  }

  disconnect() {
    this.connected = false;
    if (this._timer) clearInterval(this._timer);
    this.handlers.clear();
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }

  off(event, handler) {
    const list = this.handlers.get(event) || [];
    const index = list.indexOf(handler);
    if (index !== -1) list.splice(index, 1);
  }

  emit(event, payload = {}) {
    switch (event) {
      case STUDIO_EVENTS.CHAT_SEND: {
        const text = String(payload.text || "").trim();
        if (!text) break;
        setTimeout(() => {
          this._emitToUi(STUDIO_EVENTS.CHAT_NEW, {
            id: `mock-msg-${Date.now()}`,
            userId: payload.user?.id || "u1",
            userName: payload.user?.name || "You",
            text,
            timestamp: new Date().toISOString(),
          });
        }, 80);
        break;
      }
      case STUDIO_EVENTS.POLL_CREATE: {
        setTimeout(() => {
          this._emitToUi(STUDIO_EVENTS.POLL_UPDATE, {
            ...payload.poll,
            totalVotes: (payload.poll?.options || []).reduce(
              (sum, option) => sum + (option.votes || 0),
              0
            ),
          });
        }, 80);
        break;
      }
      case STUDIO_EVENTS.PRESENCE: {
        setTimeout(() => this._emitToUi("mock:presence", payload.patch || {}), 40);
        break;
      }
      default:
        break;
    }
  }
}

/**
 * Factory returning a connected socket controller.
 * Resolves with `{ socket, mode }` where mode is "live" or "mock".
 */
export function createStudioSocket({ sessionId, user }) {
  const serverUrl = resolveServerUrl();

  return new Promise((resolve) => {
    let settled = false;

    const settleWithMock = () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      try {
        realSocket.disconnect();
      } catch {
        /* never connected */
      }
      const mock = new MockStudioSocket({ sessionId }).connect();
      resolve({ socket: mock, mode: "mock" });
    };

    const fallbackTimer = setTimeout(settleWithMock, 2500);

    const realSocket = io(`${serverUrl}/studio`, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 2,
      timeout: 2000,
      auth: {
        token: localStorage.getItem("token"),
        demoRole: user?.role || localStorage.getItem("role") || "LEARNER",
        demoUserId: user?.id || "demo-user",
        demoName: user?.name || "Demo participant",
      },
    });

    realSocket.on("connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      realSocket.emit(STUDIO_EVENTS.JOIN, { sessionId, user });
      resolve({ socket: realSocket, mode: "live" });
    });

    realSocket.on("connect_error", settleWithMock);
    realSocket.on("disconnect", settleWithMock);
  });
}
