const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SESSION_STARTED_EVENT,
  SESSION_ENDED_EVENT,
  LIVE_START_TYPE,
  LIVE_END_TYPE,
  isLiveSessionEnabled,
  buildStartPayload,
  buildEndPayload,
  broadcastSessionStarted,
  broadcastSessionEnded,
} = require("./services/liveSessionNotificationService");
const { upsertPreferences, getPreferencesByUserId } = require("./services/notificationPreferenceService");

const TEST_USER_1 = 770001;
const TEST_USER_2 = 770002;
const TEST_USER_3 = 770003;

// --- fake Socket.IO instance -------------------------------------------

function makeSocket(userId) {
  return {
    id: `socket-${userId}`,
    user: { id: userId, role: "learner" },
    emitted: [],
    emit(evt, payload) {
      this.emitted.push({ evt, payload });
      return true;
    },
  };
}

function makeIo(sockets) {
  return { sockets: { sockets: new Map(sockets.map((s) => [s.id, s])) } };
}

test("isLiveSessionEnabled defaults to true when no preferences exist", () => {
  assert.equal(isLiveSessionEnabled(999900), true);
});

test("isLiveSessionEnabled respects opt-out via categories.liveSessions", () => {
  upsertPreferences(TEST_USER_1, { categories: { liveSessions: false } });
  assert.equal(isLiveSessionEnabled(TEST_USER_1), false);
});

test("isLiveSessionEnabled respects opt-out via pushEnabled", () => {
  upsertPreferences(TEST_USER_2, { pushEnabled: false });
  assert.equal(isLiveSessionEnabled(TEST_USER_2), false);
});

test("isLiveSessionEnabled remains on for a user who explicitly keeps liveSessions", () => {
  upsertPreferences(TEST_USER_3, { categories: { liveSessions: true } });
  assert.equal(isLiveSessionEnabled(TEST_USER_3), true);
});

test("getPreferencesByUserId exposes the liveSessions category", () => {
  const pref = getPreferencesByUserId(999900);
  assert.equal(pref, undefined);

  const created = upsertPreferences(770010, {});
  assert.equal(created.categories.liveSessions, true);
});

test("buildStartPayload carries a join link and live-start type", () => {
  const payload = buildStartPayload({
    sessionId: "sess-test-1",
    title: "React Basics",
    roomName: "room-1",
  });

  assert.equal(payload.type, LIVE_START_TYPE);
  assert.equal(payload.sessionId, "sess-test-1");
  assert.match(payload.message, /Live class starting now/);
  assert.match(payload.message, /React Basics/);
  assert.equal(payload.link, "/live-studio/sess-test-1");
  assert.equal(payload.linkLabel, "Join live class");
});

test("buildEndPayload carries a summary link and live-end type", () => {
  const payload = buildEndPayload({
    sessionId: "sess-test-1",
    title: "React Basics",
    roomName: "room-1",
    reason: "left_room",
  });

  assert.equal(payload.type, LIVE_END_TYPE);
  assert.equal(payload.sessionId, "sess-test-1");
  assert.match(payload.message, /Recording available/);
  assert.match(payload.message, /React Basics/);
  assert.equal(payload.link, "/learner/live/sess-test-1");
  assert.equal(payload.linkLabel, "View summary & recording");
});

test("buildStartPayload falls back to the default join link when no joinLink is set", () => {
  const payload = buildStartPayload({ sessionId: "sess-x" });
  assert.match(payload.link, /^\/live-studio\/sess-x$/);
});

test("broadcastSessionStarted forwards session:started to every enabled user", () => {
  const enabled = makeSocket(770020); // no prefs -> enabled
  const alsoEnabled = makeSocket(770021); // no prefs -> enabled
  const optedOut = makeSocket(770022);
  upsertPreferences(770022, { categories: { liveSessions: false } });

  const io = makeIo([enabled, alsoEnabled, optedOut]);

  const delivered = broadcastSessionStarted(io, {
    sessionId: "sess-broadcast-1",
    title: "DSA Prep",
  });

  assert.deepEqual(
    delivered.sort((a, b) => a - b),
    [770020, 770021].sort((a, b) => a - b)
  );

  const startEvents = [enabled, alsoEnabled].map((s) =>
    s.emitted.filter((e) => e.evt === SESSION_STARTED_EVENT)
  );

  startEvents.forEach((events) => {
    assert.equal(events.length, 1);
    assert.equal(events[0].payload.type, LIVE_START_TYPE);
    assert.match(events[0].payload.message, /Live class starting now/);
    assert.ok(events[0].payload.link);
  });

  // Opted-out user received nothing.
  assert.equal(
    optedOut.emitted.filter((e) => e.evt === SESSION_STARTED_EVENT).length,
    0
  );
});

test("broadcastSessionEnded forwards session:ended with summary link to enabled users only", () => {
  const enabled = makeSocket(770030);
  const optedOut = makeSocket(770031);
  upsertPreferences(770031, { categories: { liveSessions: false } });

  const io = makeIo([enabled, optedOut]);

  const delivered = broadcastSessionEnded(io, {
    sessionId: "sess-broadcast-2",
    title: "System Design",
  });

  assert.deepEqual(delivered, [770030]);

  const endEvents = enabled.emitted.filter((e) => e.evt === SESSION_ENDED_EVENT);
  assert.equal(endEvents.length, 1);
  assert.equal(endEvents[0].payload.type, LIVE_END_TYPE);
  assert.match(endEvents[0].payload.message, /Recording available/);
  assert.match(endEvents[0].payload.message, /System Design/);
  assert.equal(endEvents[0].payload.link, "/learner/live/sess-broadcast-2");

  assert.equal(
    optedOut.emitted.filter((e) => e.evt === SESSION_ENDED_EVENT).length,
    0
  );
});

test("broadcastSessionEvent tolerates a null io (no live server)", () => {
  assert.deepEqual(broadcastSessionStarted(null, {}), []);
  assert.deepEqual(broadcastSessionEnded(null, {}), []);
});