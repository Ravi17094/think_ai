require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const { runStress } = require("../stress-runner");
const { stressResourceOptions } = require("./judge0-local.cjs");
async function main() {
  const report = await runStress({
    base: process.env.LMS_STRESS_URL || "http://127.0.0.1:5000/api/lms",
    token: process.env.LMS_STRESS_TOKEN,
    concurrency: Number(process.env.LMS_STRESS_CONCURRENCY || 20),
    container: process.env.LMS_JUDGE0_CONTAINER,
    ...stressResourceOptions(process.env),
    edgeCases: process.argv.includes("--edge-cases"),
    expectUnavailable: process.argv.includes("--expect-unavailable"),
  });
  const out = path.resolve(__dirname, "../../../deliverables");
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(
    path.join(out, "code-execution-stress.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const rows = Object.entries(report.stats)
    .map(
      ([lang, s]) =>
        `| ${lang} | ${s.samples} | ${s.passed} | ${s.p50Ms ?? "Not measured"} | ${s.p95Ms ?? "Not measured"} | ${s.p99Ms ?? "Not measured"} |`,
    )
    .join("\n");
  await fs.writeFile(
    path.join(out, "code-exec-stress-test.md"),
    `# Code execution stress test\n\nMode: ${report.mode}. Sandbox execution status: **${report.executionStatus}**.\nRun: ${report.startedAt}. Concurrency: ${report.concurrency}.\n\n| Language | Requests | Successful | p50 ms | p95 ms | p99 ms |\n| --- | --- | --- | --- | --- | --- |\n${rows}\n\nPercentiles include successful sandbox executions only. HTTP 503 response times are not execution latency.\n\nRemote timeout verified: ${report.timeoutVerified ?? "Not run"}. ${report.timeoutEvidence} Sanitizer verified under load: ${report.sanitizerVerified ?? "Not run"}. Sanitizer probes: ${report.sanitizerLoad?.probeCount ?? 0}; completed with accepted remote execution: ${report.sanitizerLoad?.completed ?? 0}; settled: ${report.sanitizerLoad?.settled ?? 0}. Edge-batch concurrency: ${report.sanitizerLoad?.concurrency ?? 0} total (one timeout plus sanitizer probes); observed peak in-flight client requests: ${report.sanitizerLoad?.peakConcurrency ?? 0}; peak sanitizer requests: ${report.sanitizerLoad?.peakSanitizerConcurrency ?? 0}. Every load probe must pass and return sanitized output; these client concurrency counts do not establish remote worker concurrency. Unavailable fallback verified: ${report.fallbackVerified ?? "Not run"}. API remained healthy: ${report.apiStillHealthy}.\n\nResource source: ${report.resources.source}. CPU peak: ${report.resources.peakCpuPercent ?? "Not measured"}%. Memory peak: ${report.resources.peakMemoryPercent ?? "Not measured"}%. Raw memory usage is included per sample in the JSON report. Resource sampling spans the primary batch and the concurrent edge-case batch when enabled.\n\n${report.scaling}\n\nFor the approved live service, set LMS_STRESS_TOKEN and LMS_STRESS_URL locally and run npm run stress:patan -- --edge-cases. Run Docker metrics collection on the Judge0 host using LMS_JUDGE0_CONTAINER. For the stopped-service check, an operator must first stop the approved non-production Judge0 instance, then run with --expect-unavailable. This runner never stops a shared container automatically.\n\nFor capacity comparison, increase LMS_STRESS_CONCURRENCY across separate runs and preserve each JSON result. Respect the API's 60-request/minute limit or use the team's reviewed benchmark configuration. A single 20-request run does not establish maximum safe capacity.\n`,
  );
  console.log(
    JSON.stringify(
      {
        executionStatus: report.executionStatus,
        fallbackVerified: report.fallbackVerified,
        stats: report.stats,
      },
      null,
      2,
    ),
  );
  if (
    report.executionStatus === "FAIL" ||
    (process.argv.includes("--expect-unavailable") && !report.fallbackVerified)
  )
    process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
