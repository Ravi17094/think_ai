# WebSocket Load Test Results

- Status: **PASSED**
- Server: http://localhost:5001
- Run at: 2026-10-26T10:01:48.639Z

| Metric | Result |
| --- | --- |
| Concurrent clients | 50 |
| Test window | 10 seconds |
| Messages sent | 500 |
| Messages delivered to observer | 500 |
| Message loss rate | 0% |
| Message latency p50 / p95 / p99 | 5.13 / 26.76 / 82.72 ms |
| Vote latency p50 / p95 / p99 | 3.7 / 6.77 / 9.23 ms |
| Reconnect clients / p95 | 10 / 67.24 ms |
| Client process CPU time | 2782 ms |
| Client heap delta | 3.435516357421875 MB |

## Notes
- A single observer socket receives every chat event to calculate application-level message loss.
- CPU and heap figures are from the load-test client process. Capture server CPU and memory from the deployment monitor during the same run before making capacity decisions.
- Scaling recommendation: No client-observed latency or message-loss threshold breach in this run; verify deployment metrics before release.
