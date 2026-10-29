const { LmsError, check } = require("./errors");
const { execute: schema } = require("./schemas");
const LANGUAGES = Object.freeze({
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
});
// Text is rendered as text by clients; removing controls/ANSI/markup is defense in depth.
function sanitize(value) {
  return String(value || "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .slice(0, 20000);
}
function normalize(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trimEnd();
}
function createExecutor({
  env = process.env,
  request = fetch,
  now = Date.now,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  let active = 0;
  async function execute(input) {
    const args = schema.parse(input);
    const judgeUrl = env.JUDGE0_API_URL || env.JUDGE0_URL;
    check(
      judgeUrl,
      503,
      "EXECUTOR_UNAVAILABLE",
      "Judge0 is not configured. Ask the team for JUDGE0_API_URL (or JUDGE0_URL).",
    );
    check(
      active < Number(env.LMS_EXECUTION_CONCURRENCY || 20),
      429,
      "EXECUTOR_BUSY",
      "Code service is busy. Try again shortly.",
    );
    const languageId = Number(env[`JUDGE0_LANGUAGE_${args.language.toUpperCase()}`] || LANGUAGES[args.language]);
    check(Number.isSafeInteger(languageId) && languageId > 0, 503, "EXECUTOR_NOT_CONFIGURED", "Configure a valid Judge0 language ID.");
    active++;
    const deadline = now() + args.timeout * 1000;
    const tokens = new Set();
    const headers = { "Content-Type": "application/json" };
    if (env.JUDGE0_API_KEY) headers["X-RapidAPI-Key"] = env.JUDGE0_API_KEY;
    if (env.JUDGE0_API_HOST) headers["X-RapidAPI-Host"] = env.JUDGE0_API_HOST;
    if (env.JUDGE0_AUTH_TOKEN) headers["X-Auth-Token"] = env.JUDGE0_AUTH_TOKEN;
    const base = judgeUrl.replace(/\/$/, "");
    async function call(path, options = {}) {
      const left = deadline - now();
      check(
        left > 0,
        504,
        "EXECUTION_TIMEOUT",
        "Execution exceeded the time limit.",
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(left, 10000));
      try {
        const res = await request(`${base}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
        });
        if (!res.ok)
          throw new LmsError(
            503,
            "EXECUTOR_UNAVAILABLE",
            "Judge0 rejected the request or is unavailable.",
          );
        return await res.json();
      } catch (error) {
        if (error instanceof LmsError) throw error;
        throw new LmsError(
          now() >= deadline || error.name === "AbortError" ? 504 : 503,
          now() >= deadline || error.name === "AbortError"
            ? "EXECUTION_TIMEOUT"
            : "EXECUTOR_UNAVAILABLE",
          "Code execution timed out or the sandbox is unavailable.",
        );
      } finally {
        clearTimeout(timer);
      }
    }
    try {
      const results = [];
      // One overall deadline bounds all cases, including compilation and polling.
      for (const test of args.testCases) {
        const submitted = await call(
          "/submissions?base64_encoded=true&wait=false",
          {
            method: "POST",
            body: JSON.stringify({
              language_id: languageId,
              source_code: Buffer.from(args.sourceCode).toString("base64"),
              stdin: Buffer.from(test.input).toString("base64"),
              cpu_time_limit: Math.min(5, args.timeout),
              wall_time_limit: Math.min(args.timeout, 30),
              memory_limit: 128000,
              max_file_size: 1024,
              enable_network: false,
            }),
          },
        );
        check(
          submitted.token,
          503,
          "EXECUTOR_UNAVAILABLE",
          "Judge0 did not return a submission token.",
        );
        tokens.add(submitted.token);
        let result;
        do {
          result = await call(
            `/submissions/${encodeURIComponent(submitted.token)}?base64_encoded=true`,
          );
          if (Number(result.status?.id) > 2) break;
          await sleep(Math.min(250, Math.max(0, deadline - now())));
        } while (now() < deadline);
        check(
          Number(result?.status?.id) > 2,
          504,
          "EXECUTION_TIMEOUT",
          "Execution exceeded the time limit.",
        );
        const decode = (v) =>
          v ? Buffer.from(v, "base64").toString("utf8") : "";
        const rawOutput = decode(result.stdout);
        results.push({
          status: result.status.description,
          statusId: result.status.id,
          stdout: sanitize(rawOutput),
          stderr: sanitize(decode(result.stderr)),
          compileOutput: sanitize(decode(result.compile_output)),
          time: result.time,
          memory: result.memory,
          // Compare original text, never sanitized/truncated display text.
          passed:
            test.expectedOutput === undefined
              ? null
              : result.status.id === 3 &&
                normalize(rawOutput) === normalize(test.expectedOutput),
        });
      }
      return { language: args.language, results };
    } finally {
      active--;
      // Sandbox wall_time_limit enforces termination even if DELETE is disabled.
      // Optional DELETE also reclaims queued jobs on a self-hosted Judge0 instance.
      if (env.JUDGE0_ENABLE_DELETE === "true") {
        await Promise.allSettled(
          [...tokens].map((token) =>
            request(`${base}/submissions/${encodeURIComponent(token)}`, {
              method: "DELETE",
              headers,
              signal: AbortSignal.timeout(2000),
            }),
          ),
        );
      }
    }
  }
  return { execute };
}
module.exports = { createExecutor, sanitize, normalize, LANGUAGES };
