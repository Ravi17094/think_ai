import { describe, expect, it, vi, beforeEach } from "vitest";

const { ioMock } = vi.hoisted(() => {
  return {
    ioMock: vi.fn(() => {
      const handlers = new Map();
      const fakeSocket = {
        on(event, fn) {
          if (!handlers.has(event)) handlers.set(event, []);
          handlers.get(event).push(fn);
          if (event === "connect_error" || event === "disconnect") {
            setTimeout(() => handlers.get(event).forEach((handler) => handler()), 5);
          }
        },
        emit() {},
        disconnect() {},
      };
      return fakeSocket;
    }),
  };
});

// Mock socket.io-client so every connection reports a connect_error —
// exercising the module's in-browser mock fallback without a real server.
vi.mock("socket.io-client", () => ({
  io: ioMock,
}));

vi.mock("../../services/forumHttpClient", () => ({
  FORUM_API_BASE_URL: "http://localhost:5000/api",
}));

import {
  FORUM_EVENTS,
  createForumSocket,
  subscribeForumEvents,
} from "../../services/forumSocketClient";

describe("forumSocketClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ioMock.mockReset();
    ioMock.mockImplementation(() => {
      const handlers = new Map();
      return {
        on(event, fn) {
          if (!handlers.has(event)) handlers.set(event, []);
          handlers.get(event).push(fn);
          if (event === "connect_error" || event === "disconnect") {
            setTimeout(() => handlers.get(event).forEach((h) => h()), 5);
          }
        },
        emit() {},
        disconnect() {},
      };
    });
  });

  it("falls back to the in-browser mock when the backend is unreachable", async () => {
    const { socket, mode } = await createForumSocket({ userId: "u1" });
    expect(mode).toBe("mock");
    expect(socket.mode).toBe("mock");
  });

  it("connects to the /forum namespace for real when the server responds", async () => {
    ioMock.mockImplementation(() => {
      const handlers = new Map();
      return {
        on(event, fn) {
          if (!handlers.has(event)) handlers.set(event, []);
          handlers.get(event).push(fn);
          if (event === "connect") setTimeout(() => handlers.get(event).forEach((h) => h()), 5);
        },
        emit() {},
        disconnect() {},
      };
    });

    const { mode } = await createForumSocket({ userId: "u1" });
    expect(mode).toBe("live");
    expect(ioMock).toHaveBeenCalledWith(
      expect.stringContaining("/forum"),
      expect.objectContaining({ auth: { userId: "u1" } })
    );
  });

  it("wires one-shot handlers and disposes cleanly through subscribeForumEvents", async () => {
    const onNotification = vi.fn();
    const subscription = await subscribeForumEvents(
      { [FORUM_EVENTS.NOTIFICATION_NEW]: onNotification },
      { userId: "u1" }
    );

    expect(subscription.mode).toBe("mock");
    expect(subscription.unsubscribe).toBeTypeOf("function");

    subscription.unsubscribe();
    expect(() => subscription.socket.disconnect()).not.toThrow();
  });
});