const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createExecutor, sanitize } = require("../executor");
const { completion, gradeMcq } = require("../completion");
const schemas = require("../schemas");
const b64 = (value) => Buffer.from(value).toString("base64");
test("completion requires configured course threshold and all active assessments", () => {
  const course = {
    completionThreshold: 80,
    modules: [
      {
        lessons: [{ id: 1 }, { id: 2 }],
        assessments: [{ id: 1, status: "ACTIVE", passPercentage: 70 }],
      },
    ],
  };
  const progress = [
    { lessonId: 1, completed: true },
    { lessonId: 2, completed: true },
  ];
  assert.equal(completion(course, progress, []).eligible, false);
  assert.equal(
    completion(course, progress, [
      { assessmentId: 1, status: "GRADED", percentage: 69 },
    ]).eligible,
    false,
  );
  assert.equal(
    completion(course, progress, [
      { assessmentId: 1, status: "GRADED", percentage: 70 },
    ]).eligible,
    true,
  );
  assert.equal(
    completion({ completionThreshold: 80, modules: [] }, [], []).eligible,
    false,
  );
});
test("MCQ unanswered and incorrect options cannot earn marks", () => {
  const q = {
    marks: 4,
    options: [
      { id: 1, isCorrect: true },
      { id: 2, isCorrect: false },
    ],
  };
  assert.equal(gradeMcq(q, { selectedOptionId: 1 }).marksObtained, 4);
  assert.equal(gradeMcq(q, { selectedOptionId: 2 }).marksObtained, 0);
  assert.equal(gradeMcq(q, undefined).marksObtained, 0);
});
for (const [language, id] of Object.entries({
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
})) {
  test(`sandbox adapter supports ${language}, sends limits and compares unsanitized output`, async () => {
    let payload;
    const executor = createExecutor({
      env: { JUDGE0_URL: "https://judge.test" },
      request: async (url, options) => {
        if (options.method === "POST") {
          payload = JSON.parse(options.body);
          return { ok: true, json: async () => ({ token: "token" }) };
        }
        return {
          ok: true,
          json: async () => ({
            status: { id: 3, description: "Accepted" },
            stdout: b64("<b>42</b>\n"),
            stderr: "",
            compile_output: "",
            time: "0.1",
          }),
        };
      },
    });
    const result = await executor.execute({
      language,
      sourceCode: "test",
      testCases: [{ input: "", expectedOutput: "<b>42</b>" }],
      timeout: 30,
    });
    assert.equal(payload.language_id, id);
    assert.equal(payload.enable_network, false);
    assert.ok(payload.wall_time_limit <= 30);
    assert.equal(result.results[0].stdout, "42\n");
    assert.equal(result.results[0].passed, true);
  });
}
test("sandbox reports unavailable service without running submitted code locally", async () => {
  await assert.rejects(
    createExecutor({ env: {} }).execute({
      language: "python",
      sourceCode: "print(1)",
    }),
    (e) => e.status === 503,
  );
  const executor = createExecutor({
    env: { JUDGE0_URL: "https://judge.test" },
    request: async () => {
      throw new Error("offline");
    },
  });
  await assert.rejects(
    executor.execute({ language: "python", sourceCode: "print(1)" }),
    (e) => e.code === "EXECUTOR_UNAVAILABLE",
  );
});
test("polling stops at the overall deadline and requests cleanup", async () => {
  let clock = 0;
  const calls = [];
  const executor = createExecutor({
    env: { JUDGE0_URL: "https://judge.test", JUDGE0_ENABLE_DELETE: "true" },
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    request: async (url, options) => {
      calls.push(options.method);
      return {
        ok: true,
        json: async () =>
          options.method === "POST"
            ? { token: "slow" }
            : { status: { id: 2, description: "Processing" } },
      };
    },
  });
  await assert.rejects(
    executor.execute({
      language: "python",
      sourceCode: "while True: pass",
      timeout: 1,
    }),
    (e) => e.code === "EXECUTION_TIMEOUT",
  );
  assert.ok(clock <= 1000);
  assert.ok(calls.includes("DELETE"));
});
test("sanitization removes control sequences and bounds display output", () => {
  assert.equal(sanitize("\x1b[31mhello\x00<script>bad</script>"), "hellobad");
  assert.equal(sanitize("a".repeat(50000)).length, 20000);
});
test("input schemas reject source size, languages, forged durations and malformed timestamps", () => {
  assert.throws(() =>
    schemas.execute.parse({ language: "bash", sourceCode: "rm" }),
  );
  assert.throws(() =>
    schemas.execute.parse({
      language: "python",
      sourceCode: "x".repeat(100001),
    }),
  );
  assert.throws(() =>
    schemas.sync.parse({
      updates: [
        {
          lessonId: 1,
          enrollmentId: 1,
          watchedSeconds: 10,
          updatedAt: "bad",
          baseVersion: null,
        },
      ],
    }),
  );
  const result = schemas.sync.parse({
    updates: [
      {
        lessonId: 1,
        enrollmentId: 1,
        watchedSeconds: 10,
        updatedAt: new Date().toISOString(),
        baseVersion: null,
        totalDuration: 1,
      },
    ],
  });
  assert.equal(result.updates[0].totalDuration, undefined);
});
