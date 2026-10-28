/*
 * Day 7 live-session end-to-end verification.
 *
 * Start the backend first, then run `npm run test:live-session` in backend.
 * This validates the supported Socket.IO sequence and prints measured event
 * latency. A persistent Session/Recording API is intentionally not faked here.
 */
const { io } = require("socket.io-client");
const fs = require("fs");
const path = require("path");

const SERVER_URL = process.env.WS_TEST_URL || "http://localhost:5000";
const ROOM = `day3-e2e-${Date.now()}`;
const timeoutMs = 8000;
const REPORT_PATH = path.join(__dirname, "..", "deliverables", "live-session-e2e-results.md");

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out`)), timeoutMs);
    socket.emit(event, payload, (result) => { clearTimeout(timer); result?.ok ? resolve(result) : reject(new Error(result?.error || `${event} failed`)); });
  });
}

function connect(userId, role = "Instructor") {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, { transports: ["websocket"], extraHeaders: { "x-demo-role": role, "x-demo-user-id": userId }, reconnection: false });
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error("Socket connection timed out")); }, timeoutMs);
    socket.once("connect", () => { clearTimeout(timer); resolve(socket); });
    socket.once("connect_error", (error) => { clearTimeout(timer); reject(error); });
  });
}

function waitFor(check, message, timeout = timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (check()) { clearInterval(timer); resolve(); }
      else if (Date.now() - started >= timeout) { clearInterval(timer); reject(new Error(message)); }
    }, 20);
  });
}

function percentile(values, percent) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((percent / 100) * sorted.length) - 1)];
}

function writeReport(result) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const eventRows = result.received.map((event) => `| ${event} | Received |`);
  const markdown = [
    "# Live Session E2E Results",
    "",
    `- Status: **${result.status.toUpperCase()}**`,
    `- Server: ${SERVER_URL}`,
    `- Run at: ${new Date().toISOString()}`,
    "",
    "## Event Verification",
    "| Event | Result |",
    "| --- | --- |",
    ...eventRows,
    "",
    "## Latency",
    "| Flow | p50 | p95 | Target |",
    "| --- | --- | --- | --- |",
    `| Chat broadcast | ${result.chatLatencyMs.p50} ms | ${result.chatLatencyMs.p95} ms | <= 200 ms p95 |`,
    `| Poll broadcast | ${result.pollLatencyMs.p50} ms | ${result.pollLatencyMs.p95} ms | <= 200 ms p95 |`,
    "",
    "## Edge Cases",
    `- Late join after session start: ${result.lateJoin ? "Passed" : "Not run"}`,
    `- Learner leaves during breakout: ${result.leaveDuringBreakout ? "Passed" : "Not run"}`,
    "",
    "## Integration Checks",
    "- Recording URL persistence: Not verified - this repository does not expose a persistent recording service in the WebSocket flow.",
    "- Attendance database record: Not verified - requires the team attendance/session persistence service and test database.",
    "- Any production recording failure fallback must be verified after the recording provider is configured.",
    "",
  ].join("\n");
  fs.writeFileSync(REPORT_PATH, markdown, "utf8");
}

async function main() {
  const instructor = await connect("day3-instructor", "Instructor");
  const learner = await connect("day3-learner", "Learner");
  const received = new Set();
  const chatLatencies = [];
  const pollLatencies = [];
  let lateJoin = false;
  let leaveDuringBreakout = false;
  const record = (name) => received.add(name);
  const observe = (socket) => {
    socket.on("chat:message", () => record("chat"));
    socket.on("poll:started", () => record("poll-started"));
    socket.on("poll:results", () => record("poll-results"));
    socket.on("breakout:started", () => record("breakout-started"));
    socket.on("breakout:assign", () => record("breakout-assigned"));
    socket.on("breakout:ended", () => record("breakout-ended"));
  };
  // The learner intentionally leaves during the breakout edge case, so the
  // instructor remains the reliable observer for the final breakout event.
  observe(instructor);
  observe(learner);
  try {
    await Promise.all([emitAck(instructor, "room:join", ROOM), emitAck(learner, "room:join", ROOM)]);
    const startedAt = performance.now();
    await emitAck(instructor, "chat:message", { roomName: ROOM, text: "Day 3 E2E chat" });
    await waitFor(() => received.has("chat"), "Chat broadcast was not received");
    chatLatencies.push(performance.now() - startedAt);
    const pollStartedAt = performance.now();
    const poll = await emitAck(instructor, "poll:create", { roomName: ROOM, question: "Ready?", options: ["Yes", "No"] });
    await waitFor(() => received.has("poll-started"), "Poll start broadcast was not received");
    pollLatencies.push(performance.now() - pollStartedAt);
    await emitAck(learner, "poll:vote", { roomName: ROOM, optionIndex: 0 });
    await emitAck(instructor, "breakout:create", { roomName: ROOM, groupCount: 1 });
    await emitAck(instructor, "breakout:assign", { roomName: ROOM, groupName: `${ROOM}-breakout-1`, userId: "day3-learner" });
    const lateLearner = await connect("day3-late-learner", "Learner");
    try {
      await emitAck(lateLearner, "room:join", ROOM);
      lateJoin = true;
      await emitAck(learner, "room:leave", ROOM);
      leaveDuringBreakout = true;
    } finally {
      lateLearner.disconnect();
    }
    await emitAck(instructor, "breakout:ended", { roomName: ROOM });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const required = ["chat", "poll-started", "poll-results", "breakout-started", "breakout-assigned", "breakout-ended"];
    const missing = required.filter((event) => !received.has(event));
    if (missing.length) throw new Error(`Missing broadcast events: ${missing.join(", ")}`);
    const result = { status: "passed", room: ROOM, pollId: poll.pollId, received: [...received], lateJoin, leaveDuringBreakout, chatLatencyMs: { p50: +percentile(chatLatencies, 50).toFixed(2), p95: +percentile(chatLatencies, 95).toFixed(2) }, pollLatencyMs: { p50: +percentile(pollLatencies, 50).toFixed(2), p95: +percentile(pollLatencies, 95).toFixed(2) } };
    writeReport(result);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    instructor.disconnect(); learner.disconnect();
  }
}

main().catch((error) => { console.error(`Live session E2E failed: ${error.message}`); process.exitCode = 1; });
