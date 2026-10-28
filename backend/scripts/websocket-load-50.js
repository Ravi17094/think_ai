/* Day 7 WebSocket load test: 50 clients, join -> 10 messages -> vote -> leave. */
const { io } = require("socket.io-client");
const fs = require("fs");
const path = require("path");
const SERVER_URL = process.env.WS_TEST_URL || "http://localhost:5000";
const CLIENTS = Number(process.env.WS_CLIENTS || 50);
const ROOM = `day3-load-${Date.now()}`;
const timeoutMs = 15000;
// Five minutes is the production-test default. Set WS_TEST_WINDOW_MS=1000 for a local smoke test.
const TEST_WINDOW_MS = Number(process.env.WS_TEST_WINDOW_MS || 300000);
// Learners do not vote at the exact same millisecond in a real class. Spread
// poll votes over a short response period while keeping all sockets connected.
const VOTE_STAGGER_MS = Number(process.env.WS_VOTE_STAGGER_MS || 100);
const REPORT_PATH = path.join(
  __dirname,
  "..",
  "deliverables",
  TEST_WINDOW_MS >= 300000 ? "ws-load-test-results.md" : "ws-load-test-smoke-results.md"
);

function percentile(values, percent) { if (!values.length) return 0; const sorted = [...values].sort((a,b) => a-b); return sorted[Math.min(sorted.length - 1, Math.ceil((percent / 100) * sorted.length) - 1)]; }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function waitFor(check, message, timeout = timeoutMs) { return new Promise((resolve, reject) => { const started = Date.now(); const timer = setInterval(() => { if (check()) { clearInterval(timer); resolve(); } else if (Date.now() - started >= timeout) { clearInterval(timer); reject(new Error(message)); } }, 20); }); }
function emitAck(socket, event, payload) { return new Promise((resolve, reject) => { const started = performance.now(); const timer = setTimeout(() => reject(new Error(`${event} timed out`)), timeoutMs); socket.emit(event, payload, (result) => { clearTimeout(timer); result?.ok ? resolve(performance.now() - started) : reject(new Error(result?.error || `${event} failed`)); }); }); }
function connect(index, onReplayed) { return new Promise((resolve, reject) => { const socket = io(SERVER_URL, { transports:["websocket"], extraHeaders:{"x-demo-role":index === 0 ? "Instructor" : "Learner", "x-demo-user-id":`load-${index}`}, reconnection:false }); if (onReplayed) socket.on("room:events_replayed", onReplayed); const timer=setTimeout(()=>{socket.disconnect();reject(new Error(`client ${index} connection timed out`));},timeoutMs); socket.once("connect",()=>{clearTimeout(timer);resolve(socket);}); socket.once("connect_error",(error)=>{clearTimeout(timer);reject(error);}); }); }
function writeReport(result) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const rows = [
    ["Metric", "Result"],
    ["Concurrent clients", result.clients],
    ["Test window", `${Math.round(result.testWindowMs / 1000)} seconds`],
    ["Messages sent", result.sentMessages],
    ["Messages delivered to observer", result.deliveredMessages],
    ["Message loss rate", `${result.lossRatePercent}%`],
    ["Message latency p50 / p95 / p99", `${result.messageAckLatencyMs.p50} / ${result.messageAckLatencyMs.p95} / ${result.messageAckLatencyMs.p99} ms`],
    ["Vote latency p50 / p95 / p99", `${result.voteAckLatencyMs.p50} / ${result.voteAckLatencyMs.p95} / ${result.voteAckLatencyMs.p99} ms`],
    ["Reconnect clients / p95", `${result.reconnection.clients} / ${result.reconnection.p95Ms} ms`],
    ["Client process CPU time", `${result.processCpuMs} ms`],
    ["Client heap delta", `${result.heapDeltaMb} MB`],
  ];
  const markdown = [
    "# WebSocket Load Test Results",
    "",
    `- Status: **${result.status.toUpperCase()}**`,
    `- Server: ${SERVER_URL}`,
    `- Run at: ${new Date().toISOString()}`,
    "",
    ...rows.map((row, index) => index === 0 ? `| ${row[0]} | ${row[1]} |\n| --- | --- |` : `| ${row[0]} | ${row[1]} |`),
    "",
    "## Notes",
    "- A single observer socket receives every chat event to calculate application-level message loss.",
    "- CPU and heap figures are from the load-test client process. Capture server CPU and memory from the deployment monitor during the same run before making capacity decisions.",
    `- Scaling recommendation: ${result.messageAckLatencyMs.p95 > 200 || result.voteAckLatencyMs.p95 > 200 || result.lossRatePercent > 0 ? "Investigate Socket.IO scaling, server capacity, and room-event fan-out before release." : "No client-observed latency or message-loss threshold breach in this run; verify deployment metrics before release."}`,
    "",
  ].join("\n");
  fs.writeFileSync(REPORT_PATH, markdown, "utf8");
}

async function main() {
  const started = performance.now();
  const cpuStart = process.cpuUsage(); const memoryStart = process.memoryUsage();
  const sockets = await Promise.all(Array.from({length: CLIENTS}, (_, index) => connect(index)));
  let activeSockets = sockets;
  const latencies = [];
  const messageLatencies = [];
  const voteLatencies = [];
  let deliveredMessages = 0;
  try {
    latencies.push(...await Promise.all(sockets.map((socket) => emitAck(socket, "room:join", ROOM))));
    const instructor = sockets[0];
    instructor.on("chat:message", () => { deliveredMessages += 1; });
    await emitAck(instructor, "poll:create", { roomName: ROOM, question:"Load test vote", options:["A","B"] });
    // Spread each user's ten messages across the full test window. This models
    // classroom activity much more accurately than sending all 500 messages
    // in one startup burst, which would measure client-side burst scheduling
    // more than actual Socket.IO delivery latency.
    const messageIntervalMs = Math.max(8, Math.floor(TEST_WINDOW_MS / 10));
    const clientStaggerMs = Math.max(1, Math.floor(messageIntervalMs / CLIENTS));
    const perClientMessages = await Promise.all(sockets.map(async (socket, index) => {
      const results = [];
      await delay(index * clientStaggerMs);
      for (let round = 0; round < 10; round += 1) {
        results.push(await emitAck(socket, "chat:message", { roomName: ROOM, text:`load-${index}-${round}` }));
        if (round < 9) await delay(messageIntervalMs);
      }
      return results;
    }));
    messageLatencies.push(...perClientMessages.flat());
    latencies.push(...messageLatencies);
    await waitFor(() => deliveredMessages === CLIENTS * 10, `Expected ${CLIENTS * 10} delivered chat messages but received ${deliveredMessages}`);
    const votes = await Promise.all(sockets.slice(1).map(async (socket, index) => {
      await delay(index * VOTE_STAGGER_MS);
      return emitAck(socket, "poll:vote", { roomName: ROOM, optionIndex: 0 });
    }));
    latencies.push(...votes); voteLatencies.push(...votes);
    // Required reconnection scenario: drop 10 clients, then reconnect them together.
    const reconnectTargets = sockets.slice(0, 10);
    const replayed = new Set();
    reconnectTargets.forEach((socket) => socket.disconnect());
    const reconnectStarted = performance.now();
    const reconnected = await Promise.all(Array.from({ length: 10 }, (_, index) => connect(index, () => replayed.add(index))));
    const reconnectLatencies = await Promise.all(reconnected.map((socket) => emitAck(socket, "room:join", ROOM)));
    await waitFor(() => replayed.size === 10, `Expected replay events for 10 reconnected clients but received ${replayed.size}`);
    activeSockets = [...sockets.slice(10), ...reconnected];
    latencies.push(...reconnectLatencies);
    const reconnectionDurationMs = performance.now() - reconnectStarted;
    latencies.push(...await Promise.all(activeSockets.map((socket) => emitAck(socket, "room:leave", ROOM))));
    const remainingWindow = TEST_WINDOW_MS - (performance.now() - started);
    if (remainingWindow > 0) await delay(remainingWindow);
    const cpu = process.cpuUsage(cpuStart); const memory = process.memoryUsage();
    const result = { status:"passed", clients:CLIENTS, testWindowMs:TEST_WINDOW_MS, sentMessages:CLIENTS * 10, deliveredMessages, lossRatePercent:+(((CLIENTS * 10 - deliveredMessages) / (CLIENTS * 10) * 100).toFixed(2)), reconnection:{clients:10, replayedClients:replayed.size, durationMs:+reconnectionDurationMs.toFixed(2), p95Ms:+percentile(reconnectLatencies,95).toFixed(2)}, messageAckLatencyMs:{p50:+percentile(messageLatencies,50).toFixed(2),p95:+percentile(messageLatencies,95).toFixed(2),p99:+percentile(messageLatencies,99).toFixed(2)}, voteAckLatencyMs:{p50:+percentile(voteLatencies,50).toFixed(2),p95:+percentile(voteLatencies,95).toFixed(2),p99:+percentile(voteLatencies,99).toFixed(2)}, latencyMs:{p50:+percentile(latencies,50).toFixed(2),p95:+percentile(latencies,95).toFixed(2),p99:+percentile(latencies,99).toFixed(2)}, durationMs:+(performance.now()-started).toFixed(2), processCpuMs:+((cpu.user+cpu.system)/1000).toFixed(2), heapDeltaMb:+((memory.heapUsed-memoryStart.heapUsed)/1024/1024) };
    writeReport(result);
    console.log(JSON.stringify(result, null, 2));
  } finally { activeSockets.forEach((socket) => socket.disconnect()); }
}
main().catch((error) => { console.error(`WebSocket load test failed: ${error.message}`); process.exitCode = 1; });
