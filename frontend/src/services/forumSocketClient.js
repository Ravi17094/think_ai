import { io } from "socket.io-client";
import { FORUM_API_BASE_URL } from "./forumHttpClient";

/**
 * Forum real-time WebSocket client (Phase 8/9 / E2E Validation).
 *
 * Connects to the backend Socket.IO namespace `/forum`. Live events:
 *   notification:new   -> a mention / reply / moderation notification arrived
 *   moderation:update  -> a moderator hid / banned / unwarned / dismissed content
 *   discussion:new     -> a new thread was published (list refresh without reload)
 *   bookmark:changed   -> bookmark state changed for the current user
 *
 * When the backend is unreachable the service transparently falls back to an
 * in-browser mock so the forum UI keeps working in development and tests.
 */

export const FORUM_EVENTS = {
  CONNECTED: "forum:connected",
  NOTIFICATION_NEW: "notification:new",
  MODERATION_UPDATE: "moderation:update",
  DISCUSSION_NEW: "discussion:new",
  BOOKMARK_CHANGED: "bookmark:changed",
  USER_JOIN: "user:join",
};

/**
 * Local default identity resolver (kept independent of forumApi so the socket
 * layer stays usable even when forumApi is mocked out in tests).
 */
export function readDefaultUserId() {
  try {
    return localStorage.getItem("thinkz_forum_user_id") || "u1";
  } catch {
    return "u1";
  }
}

function resolveServerUrl() {
  if (import.meta.env.VITE_FORUM_WS_URL) return import.meta.env.VITE_FORUM_WS_URL;
  try {
    return new URL(FORUM_API_BASE_URL).origin;
  } catch {
    return window.location.origin;
  }
}

/** In-browser mock used when no live backend is available. */
class MockForumSocket {
  constructor({ userId }) {
    this.mode = "mock";
    this.userId = userId;
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
      this._emitToUi(FORUM_EVENTS.CONNECTED, { userId: this.userId, ready: true, mode: "mock" });
      // Keep the heartbeat alive so subscribers can detect liveness in mock mode.
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
      case FORUM_EVENTS.USER_JOIN: {
        this.userId = String(payload || "u1");
        setTimeout(() => {
          this._emitToUi(FORUM_EVENTS.CONNECTED, { userId: this.userId, ready: true, mode: "mock" });
        }, 40);
        break;
      }
      default:
        break;
    }
  }
}

/**
 * Factory returning a connected forum socket controller.
 * Resolves with `{ socket, mode }` where mode is "live" or "mock".
 */
export function createForumSocket({ userId = readDefaultUserId(), token = null } = {}) {
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
      const mock = new MockForumSocket({ userId }).connect();
      resolve({ socket: mock, mode: "mock" });
    };

    const fallbackTimer = setTimeout(settleWithMock, 2500);

    const auth = { userId };
    if (token) auth.token = token;

    const realSocket = io(`${serverUrl}/forum`, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 2,
      timeout: 2000,
      auth,
    });

    realSocket.on("connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      resolve({ socket: realSocket, mode: "live" });
    });

    realSocket.on("connect_error", settleWithMock);
    realSocket.on("disconnect", settleWithMock);
  });
}

/**
 * Convenience helper that connects, routes one-shot subscriptions and returns
 * a disposer — handy for hook-less wiring in tests and non-React modules.
 */
export async function subscribeForumEvents(handlers, options = {}) {
  const { socket, mode } = await createForumSocket(options);
  const entries = Object.entries(handlers || {});
  entries.forEach(([event, handler]) => socket.on(event, handler));
  return {
    socket,
    mode,
    unsubscribe() {
      entries.forEach(([event, handler]) => socket.off(event, handler));
      socket.disconnect();
    },
  };
}