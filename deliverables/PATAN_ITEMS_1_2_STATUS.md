> **27 October 2026 status:** The complete Day 1–7 assignment is **not yet 100% accepted**. Local security/completion fixes and real local Judge0 are verified. Latest Playground update: **461 mobile tests / 41 suites and TypeScript passed** (an initial cold-start timeout is recorded); backend **148 LMS + 25 CI passed**. See [PLAYGROUND_UPDATE.md](PLAYGROUND_UPDATE.md) and [PATAN_REMAINING_WORK.md](PATAN_REMAINING_WORK.md) for current evidence and the seven remaining service/client/integration/device requirements. Older counts below are historical.

# Patan: execution and certificate status

Verified 26 October 2026 in the existing Desktop checkout.

## 1. Real local code execution: PASS

The local Linux VM runs official Judge0 CE 1.13.1 with Docker 29.9.2, cgroup v1, two virtual CPUs and 4 GB allocated RAM. Image digests are recorded in judge0-local-readiness.json. The Windows API is loopback-only and requires the private token. Workers, Redis and PostgreSQL use an internal-only network. The API server has a separate bridge for its guest-loopback port; synchronous execution on that server is disabled. Code networking, callbacks, compiler options, command-line options and additional files are disabled.

- Real acceptance: **18/18 passed** through the authenticated project API and direct sandbox safety probes. Four languages, stdin, expected-output match/mismatch, compile/runtime errors, sanitization and unauthorized access were checked.
- CPU loop returned terminal Time Limit Exceeded status 5. A separate low-CPU sleeping program returned status 5 at **30.003 s wall time / 0.012 s CPU**, so a proxy timeout alone was not counted as termination.
- **20/20 concurrent executions passed**, five per language. A separate concurrent edge batch passed one CPU-timeout probe and all 19 malicious-input sanitizer probes.
- Actual worker Docker metrics were collected over SSH, with no sampling errors. Peak worker CPU: **177.17%**; peak worker memory: **12.87%** of the VM limit. Docker CPU is per logical CPU, so the two-vCPU container can exceed 100%. These figures cover the worker container, not the entire VM.
- Sandbox stop check: **20/20 friendly HTTP 503s**, backend health stayed good. Cold restart reused the existing images without a pull, reran all four hello programs, and the backend again returned `Hello, Patan!` with the expected-output match.
- The real learner browser Run button displayed `Accepted`, `Hello, Patan!`, and `Expected output matched`. Screenshot: playground-real-output.jpg.

| Language | Requests | Passed | p50 ms | p95 ms | p99 ms |
| --- | --- | --- | --- | --- | --- |
| python | 5 | 5 | 3827 | 5494 | 5494 |
| javascript | 5 | 5 | 3675 | 5760 | 5760 |
| java | 5 | 5 | 6975 | 8831 | 8831 |
| cpp | 5 | 5 | 5361 | 7573 | 7573 |

Only five samples per language were measured. This establishes this local 20-request run; it does not establish maximum or production capacity. Judge0's image provides the recorded compiler versions; Windows Node.js is separate from the sandbox JavaScript runtime. The mobile draft/history changes were reapplied and refined in the subsequent 27 October Playground update; see PLAYGROUND_UPDATE.md.

Evidence: code-execution-acceptance.json, code-execution-stress.json, code-execution-unavailable.json, judge0-local-readiness.json and code-exec-stress-test.md.

## 2. Real certificate S3/email/client branding: PENDING

The real staging runner was executed and returned **NOT_RUN**. No staging records, S3 objects or actual emails were created. A local PDF or mocked storage/mail test is not live delivery evidence.

The existing durable delivery safeguard was verified: uncertain sends become UNKNOWN and never automatically resend. Added receipt-only verification of the original finished staging run. A later inbox receipt can now be checked without creating another course/certificate or another email. NOT_RUN, failed and incomplete flows cannot be promoted to PASS by a receipt.

Required inputs from the team/deployment administrator:

| Input | Local configuration |
| --- | --- |
| Approved private S3 bucket, region, IAM access and app CORS | AWS_S3_BUCKET or LMS_CERTIFICATE_BUCKET; AWS_REGION or AWS_S3_REGION; approved IAM role/profile or standard AWS credentials |
| Verified SendGrid sender and key | FROM_EMAIL; SENDGRID_API_KEY |
| Approved test environment and existing learner recipient | LMS_E2E_DATABASE_URL; LMS_E2E_RECIPIENT; explicit LMS_E2E_ENVIRONMENT=staging |
| Real client certificate branding | Client logo, accreditation wording, signatory/signature and brand guide; LMS_BRANDING_FILE using branding.example.json |
| Actual inbox receipt for the same certificate/link | LMS_E2E_EMAIL_RECEIPT_FILE; actual receivedAt timestamp |

Keep secrets in local environment/approved credential storage, not chat or source. Confirm the recipient before sending a test email. After configuration, run `npm run e2e:day7` once. After the recipient confirms delivery, run `node lms/scripts/verify-certificate-receipt.js`; both PDF availability and actual email arrival must be under 30 seconds. Native sharing still needs device acceptance.

## Verification counts

| Check | Before | After |
| --- | --- | --- |
| Backend LMS suite | 135 passed | 148 passed |
| Backend CI suite | 25 passed | 25 passed |
| Mobile TypeScript | Passed | Passed |
| Mobile Jest | 401 / 38 suites passed | 461 / 41 suites passed (27 October Playground update) |

Jest used a writable local cache directory because the Windows sandbox's default temporary-cache rename operation returned EPERM. No project test configuration was changed for that workaround. API/Expo health were HTTP 200 after restart. See PATAN_ITEMS_1_2_CHANGED_FILES.md for the complete project file list.
