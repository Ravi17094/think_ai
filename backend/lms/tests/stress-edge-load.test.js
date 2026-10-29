const { test } = require("node:test");
const assert = require("node:assert/strict");
const { runStress, stats } = require("../stress-runner");

function fakeApi({ badSanitizer, proxyTimeout = false, unavailable = false } = {}) {
  const counts = { primary: 0, sanitizer: 0, timeout: 0, health: 0 };
  const peaks = { total: 0, primary: 0, edge: 0 };
  const active = { total: 0, primary: 0, edge: 0 };
  const response = (status, results, code) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      code,
      message: status === 503 ? "Code service unavailable." : "Execution response.",
      data: results ? { results } : undefined,
    }),
  });
  const request = async (url, options) => {
    if (String(url).includes("/health")) {
      counts.health++;
      return { ok: true };
    }
    const body = JSON.parse(options.body);
    const kind = body.sourceCode === "while True: pass"
      ? "timeout"
      : body.sourceCode.includes("sys.stdin.read()")
        ? "sanitizer"
        : "primary";
    counts[kind]++;
    const ordinal = counts[kind];
    const phase = kind === "primary" ? "primary" : "edge";
    if (phase === "edge") assert.equal(active.primary, 0, "primary and edge batches must not overlap");
    active.total++;
    active[phase]++;
    peaks.total = Math.max(peaks.total, active.total);
    peaks[phase] = Math.max(peaks[phase], active[phase]);
    // Yield once so concurrently launched requests overlap deterministically.
    // Every response is fabricated in process; fetch and sockets are never used.
    await new Promise((resolve) => setImmediate(resolve));
    active.total--;
    active[phase]--;
    if (unavailable) return response(503, undefined, "EXECUTOR_UNAVAILABLE");
    if (kind === "timeout")
      return proxyTimeout
        ? response(504, undefined, "EXECUTION_TIMEOUT")
        : response(200, [{ passed: false, statusId: 5, stdout: "", stderr: "" }]);
    if (kind === "sanitizer") {
      const input = body.testCases[0].input;
      assert.match(input, /SHELL_PAYLOAD/);
      assert.match(input, /<script>/);
      if (ordinal === 7 && badSanitizer === "network") throw new Error("Synthetic connection failure");
      const stdout = ordinal === 7 && badSanitizer === "markup"
        ? input
        : input.replace(/<[^>]*>/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
      return response(200, [{
        passed: !(ordinal === 7 && badSanitizer === "failed"),
        statusId: 3,
        stdout,
        stderr: "",
      }]);
    }
    return response(200, [{ passed: true, statusId: 3, stdout: "42", stderr: "" }]);
  };
  return { request, counts, peaks };
}
async function run(options = {}, overrides = {}) {
  const fake = fakeApi(options);
  const report = await runStress({
    base: "https://fake-api.example.invalid/api/lms",
    token: "test-token-only",
    edgeCases: true,
    concurrency: 20,
    request: fake.request,
    ...overrides,
  });
  return { ...fake, report };
}

test("edge load reaches 20 requests with all 19 sanitizer probes accepted and verified", async () => {
  const { report, counts, peaks } = await run();
  assert.deepEqual(counts, { primary: 20, sanitizer: 19, timeout: 1, health: 1 });
  assert.deepEqual(peaks, { total: 20, primary: 20, edge: 20 });
  assert.equal(report.sanitizerLoad.concurrency, 20);
  assert.equal(report.sanitizerLoad.peakConcurrency, 20);
  assert.equal(report.sanitizerLoad.peakSanitizerConcurrency, 19);
  assert.equal(report.sanitizerLoad.probeCount, 19);
  assert.equal(report.sanitizerLoad.settled, 19);
  assert.equal(report.sanitizerLoad.completed, 19);
  assert.equal(report.sanitizerLoad.probes.length, 19);
  assert.ok(report.sanitizerLoad.probes.every((row) => row.passed && row.sanitized));
  assert.equal(report.sanitizerLoad.verifiedAll, true);
  assert.equal(report.sanitizerVerified, true);
  assert.deepEqual(report.sanitizerProbe, report.sanitizerLoad.probes[0]);
  assert.equal(report.timeoutVerified, true);
  assert.equal(report.executionStatus, "PASS");
  assert.equal(report.executions.length, 20, "edge probes cannot enter the language latency sample");
  assert.deepEqual(report.stats, stats(report.executions));
  for (const language of ["python", "javascript", "java", "cpp"]) {
    assert.equal(report.stats[language].samples, 5);
    assert.equal(report.stats[language].passed, 5);
    assert.notEqual(report.stats[language].p50Ms, null);
  }
});

for (const badSanitizer of ["markup", "failed", "network"]) {
  test(`one ${badSanitizer} sanitizer probe fails verification even when the compatible primary probe passes`, async () => {
    const { report, counts } = await run({ badSanitizer });
    assert.equal(counts.sanitizer, 19);
    assert.equal(report.sanitizerProbe.passed, true);
    assert.equal(report.sanitizerProbe.sanitized, true);
    assert.equal(report.sanitizerLoad.settled, 19);
    assert.equal(report.sanitizerLoad.completed, badSanitizer === "network" ? 18 : 19);
    assert.equal(report.sanitizerLoad.verifiedAll, false);
    assert.equal(report.sanitizerVerified, false);
    assert.equal(report.timeoutVerified, true);
    assert.equal(report.executionStatus, "FAIL");
    if (badSanitizer === "markup") assert.equal(report.sanitizerLoad.probes[6].sanitized, false);
    if (badSanitizer === "failed") assert.equal(report.sanitizerLoad.probes[6].passed, false);
    if (badSanitizer === "network") assert.equal(report.sanitizerLoad.probes[6].httpStatus, 0);
  });
}

test("a proxy-only deadline never establishes remote timeout termination", async () => {
  const { report } = await run({ proxyTimeout: true });
  assert.equal(report.sanitizerLoad.completed, 19);
  assert.equal(report.sanitizerLoad.verifiedAll, true);
  assert.equal(report.timeoutProbe.httpStatus, 504);
  assert.equal(report.timeoutProbe.code, "EXECUTION_TIMEOUT");
  assert.equal(report.timeoutVerified, false);
  assert.match(report.timeoutEvidence, /Proxy deadline only/);
  assert.match(report.timeoutEvidence, /NOT verified/);
  assert.equal(report.executionStatus, "FAIL");
});

test("ordinary runs retain the original 20-request language batch without edge probes", async () => {
  const { report, counts } = await run({}, { edgeCases: false });
  assert.deepEqual(counts, { primary: 20, sanitizer: 0, timeout: 0, health: 1 });
  assert.equal(report.sanitizerLoad, null);
  assert.equal(report.sanitizerProbe, null);
  assert.equal(report.sanitizerVerified, null);
  assert.equal(report.timeoutVerified, null);
  assert.equal(report.executionStatus, "PASS");
});

test("unavailable-service verification does not launch sanitizer or timeout load", async () => {
  const { report, counts } = await run({ unavailable: true }, { expectUnavailable: true });
  assert.deepEqual(counts, { primary: 20, sanitizer: 0, timeout: 0, health: 1 });
  assert.equal(report.sanitizerLoad, null);
  assert.equal(report.fallbackVerified, true);
  assert.equal(report.executionStatus, "NOT_RUN");
});
