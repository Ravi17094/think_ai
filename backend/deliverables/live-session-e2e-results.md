# Live Session E2E Results

- Status: **PASSED**
- Server: http://localhost:5001
- Run at: 2026-10-26T10:01:04.367Z

## Event Verification
| Event | Result |
| --- | --- |
| chat | Received |
| poll-started | Received |
| poll-results | Received |
| breakout-started | Received |
| breakout-assigned | Received |
| breakout-ended | Received |

## Latency
| Flow | p50 | p95 | Target |
| --- | --- | --- | --- |
| Chat broadcast | 32.96 ms | 32.96 ms | <= 200 ms p95 |
| Poll broadcast | 32.85 ms | 32.85 ms | <= 200 ms p95 |

## Edge Cases
- Late join after session start: Passed
- Learner leaves during breakout: Passed

## Integration Checks
- Recording URL persistence: Not verified - this repository does not expose a persistent recording service in the WebSocket flow.
- Attendance database record: Not verified - requires the team attendance/session persistence service and test database.
- Any production recording failure fallback must be verified after the recording provider is configured.
