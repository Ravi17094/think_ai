# WebSocket Load Test Results

- Status: **PASSED**
- Server: http://localhost:5001
- Run at: 2026-10-26T10:07:20.949Z

| Metric | Result |
| --- | --- |
| Concurrent clients | 50 |
| Test window | 300 seconds |
| Messages sent | 500 |
| Messages delivered to observer | 500 |
| Message loss rate | 0% |
| Message latency p50 / p95 / p99 | 5.97 / 113.31 / 682.96 ms |
| Vote latency p50 / p95 / p99 | 4.08 / 15.15 / 24.14 ms |
| Reconnect clients / p95 | 10 / 44.4 ms |
| Client process CPU time | 3484 ms |
| Client heap delta | 3.6893844604492188 MB |

## Notes
- A single observer socket receives every chat event to calculate application-level message loss.
- CPU and heap figures are from the load-test client process. Capture server CPU and memory from the deployment monitor during the same run before making capacity decisions.
- Scaling recommendation: No client-observed latency or message-loss threshold breach in this run; verify deployment metrics before release.
