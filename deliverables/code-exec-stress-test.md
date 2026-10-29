# Code execution stress test

Mode: live code execution. Sandbox execution status: **PASS**.
Run: 2026-10-26T15:05:05.343Z. Concurrency: 20.

| Language | Requests | Successful | p50 ms | p95 ms | p99 ms |
| --- | --- | --- | --- | --- | --- |
| python | 5 | 5 | 3827 | 5494 | 5494 |
| javascript | 5 | 5 | 3675 | 5760 | 5760 |
| java | 5 | 5 | 6975 | 8831 | 8831 |
| cpp | 5 | 5 | 5361 | 7573 | 7573 |

Percentiles include successful sandbox executions only. HTTP 503 response times are not execution latency.

Remote timeout verified: true. Judge0 returned terminal Time Limit Exceeded status. Sanitizer verified under load: true. Sanitizer probes: 19; completed with accepted remote execution: 19; settled: 19. Edge-batch concurrency: 20 total (one timeout plus sanitizer probes); observed peak in-flight client requests: 20; peak sanitizer requests: 19. Every load probe must pass and return sanitized output; these client concurrency counts do not establish remote worker concurrency. Unavailable fallback verified: Not run. API remained healthy: true.

Resource source: docker stats via SSH in local Judge0 VM. CPU peak: 177.17%. Memory peak: 12.87%. Raw memory usage is included per sample in the JSON report. Resource sampling spans the primary batch and the concurrent edge-case batch when enabled.

Validated 20 concurrent requests in this run only. Run increasing levels on the approved sandbox and compare p95 and resource saturation before setting a production threshold.

For the approved live service, set LMS_STRESS_TOKEN and LMS_STRESS_URL locally and run npm run stress:patan -- --edge-cases. Run Docker metrics collection on the Judge0 host using LMS_JUDGE0_CONTAINER. For the stopped-service check, an operator must first stop the approved non-production Judge0 instance, then run with --expect-unavailable. This runner never stops a shared container automatically.

For capacity comparison, increase LMS_STRESS_CONCURRENCY across separate runs and preserve each JSON result. Respect the API's 60-request/minute limit or use the team's reviewed benchmark configuration. A single 20-request run does not establish maximum safe capacity.

## Separate real termination, unavailable-service and restart evidence

The real acceptance runner passed 18/18 checks. A sleeping Python program hit terminal status 5 at 30.003 s wall / 0.012 s CPU; this establishes the configured wall limit independently of the proxy deadline. See code-execution-acceptance.json.

The primary benchmark above did not stop the service. A separate stopped-VM check passed 20/20 friendly HTTP 503s with API health intact (code-execution-unavailable.json). Cold restart reused locked local images, passed four hello programs and a fresh authenticated backend execution (judge0-local-readiness.json).

Metrics above are actual worker-container Docker samples over SSH, not host-wide or whole-VM resource totals. The VM has two virtual CPUs and 4 GB RAM. With five samples per language, p95 and p99 are the same maximum sample in this run; this is not a production capacity claim.
