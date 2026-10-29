const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const runFile = promisify(execFile);
const sources = {
  python: "print(42)",
  javascript: "console.log(42);",
  java: "public class Main { public static void main(String[] a) { System.out.println(42); } }",
  cpp: "#include <iostream>\nint main(){std::cout<<42<<std::endl;}",
};
const percentile = (values, p) =>
  values.length
    ? [...values].sort((a, b) => a - b)[
        Math.max(0, Math.ceil(values.length * p) - 1)
      ]
    : null;
function stats(rows) {
  return Object.fromEntries(
    Object.keys(sources).map((language) => {
      const all = rows.filter((r) => r.language === language),
        ok = all.filter((r) => r.passed);
      return [
        language,
        {
          samples: all.length,
          passed: ok.length,
          failed: all.length - ok.length,
          p50Ms: percentile(
            ok.map((r) => r.latencyMs),
            0.5,
          ),
          p95Ms: percentile(
            ok.map((r) => r.latencyMs),
            0.95,
          ),
          p99Ms: percentile(
            ok.map((r) => r.latencyMs),
            0.99,
          ),
        },
      ];
    }),
  );
}
async function dockerSample(container, execute = runFile) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(container))
    throw new Error("Invalid Judge0 container name.");
  const { stdout } = await execute(
    "docker",
    ["stats", "--no-stream", "--format", "{{json .}}", container],
    { timeout: 10000, windowsHide: true },
  );
  const row = JSON.parse(stdout.trim());
  return {
    at: new Date().toISOString(),
    cpuPercent: Number(String(row.CPUPerc).replace("%", "")),
    memoryUsage: row.MemUsage,
    memoryPercent: Number(String(row.MemPerc).replace("%", "")),
  };
}
async function runStress({
  base,
  token,
  concurrency = 20,
  edgeCases = false,
  expectUnavailable = false,
  container,
  resourceCommand,
  resourceSource = "docker stats on this host",
  request = fetch,
}) {
  if (!token)
    throw new Error("Set LMS_STRESS_TOKEN locally to a signed learner token.");
  if (!Number.isInteger(concurrency) || concurrency < 4 || concurrency > 100)
    throw new Error("Concurrency must be between 4 and 100.");
  const execute = async (
    language,
    sourceCode,
    { timeout = 30, input = "", expectedOutput = "42" } = {},
  ) => {
    const began = performance.now();
    try {
      const response = await request(
        `${base.replace(/\/$/, "")}/code/execute`,
        {
          method: "POST",
          signal: AbortSignal.timeout((timeout + 10) * 1000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            language,
            sourceCode,
            timeout,
            testCases: [{ input, expectedOutput }],
          }),
        },
      );
      const result = await response.json();
      const sandbox = result.data?.results || [];
      return {
        language,
        latencyMs: Math.round(performance.now() - began),
        httpStatus: response.status,
        passed:
          response.ok &&
          sandbox.length > 0 &&
          sandbox.every((r) => r.passed === true),
        code: result.code || null,
        statuses: sandbox.map((r) => r.statusId),
        sanitized: sandbox.every(
          (r) => !/<script|<img|\x1b\[/i.test(r.stdout + r.stderr),
        ),
        friendlyError:
          typeof result.message === "string" && result.message.length > 0,
      };
    } catch (error) {
      return {
        language,
        latencyMs: Math.round(performance.now() - began),
        passed: false,
        httpStatus: 0,
        code: error.name,
      };
    }
  };
  const resources = [],
    resourceErrors = [];
  let pendingSample = null;
  const sample = () => {
    if (!container) return Promise.resolve();
    if (pendingSample) return pendingSample;
    pendingSample = (async () => {
      try {
        resources.push(await dockerSample(container, resourceCommand));
      } catch (error) {
        resourceErrors.push(error.code || error.name);
      }
    })().finally(() => {
      pendingSample = null;
    });
    return pendingSample;
  };
  await sample();
  const timer = container
    ? setInterval(() => {
        void sample();
      }, 1000)
    : null;
  const startedAt = new Date().toISOString();
  let rows,
    timeoutProbe = null,
    sanitizerProbe = null,
    sanitizerLoad = null;
  try {
    rows = await Promise.all(
      Array.from({ length: concurrency }, (_, i) => {
        const lang = Object.keys(sources)[i % 4];
        return execute(lang, sources[lang]);
      }),
    );
    if (edgeCases && !expectUnavailable) {
      const input =
        "; echo SHELL_PAYLOAD $(id) <script>alert(1)</script>\u001b[31m";
      const loadStartedAt = new Date().toISOString();
      const loadConcurrency = 20;
      let active = 0,
        peak = 0,
        activeSanitizers = 0,
        peakSanitizers = 0;
      const edgeExecute = async (sanitizer, ...args) => {
        active++;
        peak = Math.max(peak, active);
        if (sanitizer) {
          activeSanitizers++;
          peakSanitizers = Math.max(peakSanitizers, activeSanitizers);
        }
        try {
          return await execute(...args);
        } finally {
          active--;
          if (sanitizer) activeSanitizers--;
        }
      };
      // A separate batch keeps the four-language latency sample unchanged.
      // The timeout competes with every malicious-output echo under the same
      // bounded client load; these are not sequential single-request probes.
      const [timeout, ...probes] = await Promise.all([
        edgeExecute(false, "python", "while True: pass", { timeout: 30 }),
        ...Array.from({ length: loadConcurrency - 1 }, () =>
          edgeExecute(true, "python", "import sys\nprint(sys.stdin.read())", {
            input,
            expectedOutput: input,
          }),
        ),
      ]);
      timeoutProbe = timeout;
      sanitizerProbe = probes[0];
      const completed = probes.filter(
        (probe) =>
          probe.httpStatus >= 200 &&
          probe.httpStatus < 300 &&
          probe.statuses?.length > 0 &&
          probe.statuses.every((status) => status === 3),
      ).length;
      sanitizerLoad = {
        startedAt: loadStartedAt,
        finishedAt: new Date().toISOString(),
        concurrency: loadConcurrency,
        peakConcurrency: peak,
        peakSanitizerConcurrency: peakSanitizers,
        probeCount: loadConcurrency - 1,
        settled: probes.length,
        completed,
        verifiedAll:
          completed === loadConcurrency - 1 &&
          probes.every((probe) => probe.passed && probe.sanitized),
        probes,
      };
    }
  } finally {
    if (timer) clearInterval(timer);
    await sample();
  }
  const unavailable =
    expectUnavailable &&
    rows.every((r) => r.httpStatus === 503 && r.friendlyError);
  let apiStillHealthy = false;
  try {
    apiStillHealthy = (
      await request(new URL("/api/health", base), {
        signal: AbortSignal.timeout(5000),
      })
    ).ok;
  } catch {}
  const successes = rows.filter((r) => r.passed).length;
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: expectUnavailable
      ? "unavailable-service verification"
      : "live code execution",
    concurrency,
    stats: stats(rows),
    executions: rows,
    timeoutProbe,
    timeoutVerified: timeoutProbe
      ? timeoutProbe.statuses?.includes(5) === true
      : null,
    timeoutEvidence: timeoutProbe?.statuses?.includes(5)
      ? "Judge0 returned terminal Time Limit Exceeded status."
      : timeoutProbe?.code === "EXECUTION_TIMEOUT"
        ? "Proxy deadline only; remote termination is NOT verified."
        : "Remote termination was not established.",
    sanitizerProbe,
    sanitizerLoad,
    sanitizerVerified: sanitizerLoad ? sanitizerLoad.verifiedAll : null,
    fallbackVerified: expectUnavailable ? unavailable && apiStillHealthy : null,
    apiStillHealthy,
    resources: {
      source: container ? resourceSource : "not configured",
      samples: resources,
      errors: resourceErrors,
      peakCpuPercent: resources.length
        ? Math.max(...resources.map((r) => r.cpuPercent))
        : null,
      peakMemoryPercent: resources.length
        ? Math.max(...resources.map((r) => r.memoryPercent))
        : null,
    },
    executionStatus: expectUnavailable
      ? "NOT_RUN"
      : successes === rows.length &&
          (!edgeCases ||
            (timeoutProbe.statuses?.includes(5) &&
              sanitizerLoad.verifiedAll))
        ? "PASS"
        : "FAIL",
    scaling:
      successes === rows.length
        ? `Validated ${concurrency} concurrent requests in this run only. Run increasing levels on the approved sandbox and compare p95 and resource saturation before setting a production threshold.`
        : "No capacity recommendation: successful sandbox executions were not established.",
  };
}
module.exports = { sources, percentile, stats, dockerSample, runStress };
