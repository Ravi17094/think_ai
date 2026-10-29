const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createExecutor } = require("../executor");
const { runStress } = require("../stress-runner");

test("executor accepts JUDGE0_API_URL and a configured language ID", async () => {
  const requests = [];
  const executor = createExecutor({
    env: { JUDGE0_API_URL: "https://approved-judge.example.invalid", JUDGE0_LANGUAGE_PYTHON: "101" },
    request: async (url, options) => {
      requests.push([url, options]);
      return { ok: true, json: async () => options.method === "POST" ? { token: "opaque" } : { status: { id: 3, description: "Accepted" }, stdout: Buffer.from("42").toString("base64") } };
    },
  });
  assert.equal((await executor.execute({ language: "python", sourceCode: "print(42)", testCases: [{ input: "", expectedOutput: "42" }] })).results[0].passed, true);
  assert.ok(requests[0][0].startsWith("https://approved-judge.example.invalid/"));
  assert.equal(JSON.parse(requests[0][1].body).language_id, 101);
});
test("malformed language configuration fails before making a sandbox request", async () => {
  let calls = 0;
  const executor = createExecutor({ env: { JUDGE0_API_URL: "https://judge.invalid", JUDGE0_LANGUAGE_PYTHON: "bad" }, request: async () => { calls++; } });
  await assert.rejects(executor.execute({ language: "python", sourceCode: "print(42)" }), error => error.code === "EXECUTOR_NOT_CONFIGURED");
  assert.equal(calls, 0);
});
for (const remoteStatus of [false, true]) {
  test(`stress report requires remote termination evidence (terminal Judge0 status=${remoteStatus})`, async () => {
    const report = await runStress({
      base: "https://local-api.example.invalid/api/lms", token: "test-only", concurrency: 4, edgeCases: true,
      request: async (url, options) => {
        if (String(url).includes("/health")) return { ok: true };
        const body = JSON.parse(options.body);
        if (body.sourceCode === "while True: pass" && !remoteStatus) return { ok: false, status: 504, json: async () => ({ code: "EXECUTION_TIMEOUT", message: "Proxy deadline reached" }) };
        const timeout = body.sourceCode === "while True: pass";
        return { ok: true, status: 200, json: async () => ({ data: { results: [{ passed: timeout ? false : true, statusId: timeout ? 5 : 3, stdout: "42", stderr: "" }] } }) };
      },
    });
    assert.equal(report.timeoutVerified, remoteStatus);
    assert.equal(report.executionStatus, remoteStatus ? "PASS" : "FAIL");
    if (!remoteStatus) assert.match(report.timeoutEvidence, /NOT verified/);
  });
}
