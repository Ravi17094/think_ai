import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notificationReducer from "../../features/preferenceNotification/preferenceNotificationSlice";
import {
  buildLiveSessionToast,
  isLiveSessionOptedOut,
  LIVE_SESSION_EVENTS,
  LIVE_SESSION_TYPES,
  useLiveSessionNotifications,
} from "../../hooks/useLiveSessionNotifications";

class FakeSocket {
  constructor() {
    this.handlers = new Map();
    this.disconnected = false;
  }
  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }
  off(event, handler) {
    const list = this.handlers.get(event) || [];
    this.handlers.set(event, list.filter((h) => h !== handler));
  }
  disconnect() {
    this.disconnected = true;
    this.handlers.clear();
  }
  simulate(event, payload) {
    (this.handlers.get(event) || []).forEach((h) => h(payload));
  }
}

function makeStore(preferences) {
  const store = configureStore({ reducer: { notifications: notificationReducer } });
  if (preferences) {
    store.dispatch({
      type: "notifications/fetchPreferences/fulfilled",
      payload: preferences,
    });
  }
  return store;
}

function Harness({ socket, user }) {
  useLiveSessionNotifications({ user, connect: () => socket });
  return null;
}

const startedPayload = {
  type: LIVE_SESSION_TYPES.START,
  sessionId: "sess-a",
  title: "React Basics",
  message: "Live class starting now — React Basics",
  link: "/live-studio/sess-a",
  linkLabel: "Join live class",
};

const endedPayload = {
  type: LIVE_SESSION_TYPES.END,
  sessionId: "sess-a",
  title: "React Basics",
  message: "Recording available — React Basics",
  link: "/learner/live/sess-a",
  linkLabel: "View summary & recording",
};

describe("buildLiveSessionToast", () => {
  it("maps a session:started payload to a join-link toast", () => {
    const toast = buildLiveSessionToast(LIVE_SESSION_EVENTS.STARTED, startedPayload);
    expect(toast.title).toBe("React Basics");
    expect(toast.message).toMatch(/Live class starting now/);
    expect(toast.link).toBe("/live-studio/sess-a");
    expect(toast.linkLabel).toBe("Join live class");
  });

  it("maps a session:ended payload to a summary-link toast", () => {
    const toast = buildLiveSessionToast(LIVE_SESSION_EVENTS.ENDED, endedPayload);
    expect(toast.message).toMatch(/Recording available/);
    expect(toast.link).toBe("/learner/live/sess-a");
    expect(toast.linkLabel).toBe("View summary & recording");
  });

  it("ignores session-management payloads that carry no notification type", () => {
    expect(buildLiveSessionToast(LIVE_SESSION_EVENTS.STARTED, { sessionId: "x", roomName: "r" })).toBeNull();
  });
});

describe("isLiveSessionOptedOut", () => {
  it("enables live-session notifications by default", () => {
    expect(isLiveSessionOptedOut(null)).toBe(false);
    expect(isLiveSessionOptedOut({ categories: {} })).toBe(false);
  });

  it("returns true when categories.liveSessions is false", () => {
    expect(isLiveSessionOptedOut({ categories: { liveSessions: false } })).toBe(true);
  });

  it("returns true when the push channel is disabled", () => {
    expect(isLiveSessionOptedOut({ pushEnabled: false, categories: {} })).toBe(true);
  });
});

describe("useLiveSessionNotifications (Notification Center)", () => {
  it("listens to session:started and shows a toast with a join link", () => {
    const store = makeStore();
    const socket = new FakeSocket();
    render(
      <Provider store={store}>
        <Harness socket={socket} user={{ id: 1, role: "learner" }} />
      </Provider>
    );

    socket.simulate(LIVE_SESSION_EVENTS.STARTED, startedPayload);

    const toasts = store.getState().notifications.activeToasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toMatch(/Live class starting now/);
    expect(toasts[0].link).toBe("/live-studio/sess-a");
    expect(store.getState().notifications.unreadCount).toBe(1);
  });

  it("listens to session:ended and shows a toast with a summary link", () => {
    const store = makeStore();
    const socket = new FakeSocket();
    render(
      <Provider store={store}>
        <Harness socket={socket} user={{ id: 1, role: "learner" }} />
      </Provider>
    );

    socket.simulate(LIVE_SESSION_EVENTS.ENDED, endedPayload);

    const toasts = store.getState().notifications.activeToasts;
    expect(toasts[0].message).toMatch(/Recording available/);
    expect(toasts[0].linkLabel).toBe("View summary & recording");
  });

  it("does not deliver notifications when the user opted out of live sessions", () => {
    const store = makeStore({ userId: 1, categories: { liveSessions: false } });
    const socket = new FakeSocket();
    render(
      <Provider store={store}>
        <Harness socket={socket} user={{ id: 1, role: "learner" }} />
      </Provider>
    );

    socket.simulate(LIVE_SESSION_EVENTS.STARTED, startedPayload);
    socket.simulate(LIVE_SESSION_EVENTS.ENDED, endedPayload);

    expect(store.getState().notifications.activeToasts).toHaveLength(0);
    expect(store.getState().notifications.unreadCount).toBe(0);
  });

  it("delivers the event to every open tab (two-browser-tab real-time delivery)", () => {
    const store = makeStore();
    const tabOneSocket = new FakeSocket();
    const tabTwoSocket = new FakeSocket();

    render(
      <Provider store={store}>
        <Harness socket={tabOneSocket} user={{ id: 1, role: "learner" }} />
      </Provider>
    );
    render(
      <Provider store={store}>
        <Harness socket={tabTwoSocket} user={{ id: 1, role: "learner" }} />
      </Provider>
    );

    // Both sockets represent the same user's two open browser tabs and
    // both receive the backend fan-out.
    tabOneSocket.simulate(LIVE_SESSION_EVENTS.STARTED, startedPayload);
    tabTwoSocket.simulate(LIVE_SESSION_EVENTS.STARTED, startedPayload);

    const state = store.getState().notifications;
    expect(state.activeToasts).toHaveLength(2);
    expect(state.unreadCount).toBe(2);
    expect(state.notificationsList).toHaveLength(2);
  });
});

describe("session management payloads do not create spurious toasts", () => {
  it("ignores the bare session object pushed to the joining socket", () => {
    const store = makeStore();
    const socket = new FakeSocket();
    render(
      <Provider store={store}>
        <Harness socket={socket} user={{ id: 1, role: "learner" }} />
      </Provider>
    );

    socket.simulate(LIVE_SESSION_EVENTS.STARTED, {
      sessionId: "sess-x",
      userId: 1,
      roomName: "r",
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });

    expect(store.getState().notifications.activeToasts).toHaveLength(0);
  });
});