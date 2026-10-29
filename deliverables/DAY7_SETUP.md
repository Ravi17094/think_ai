# Day 7 configuration and verification guide

Source has already been updated in the Desktop think_ai checkout. Preserve its existing `.env` and `.git`. Source ZIPs exclude secrets, local accounts and node_modules. Use `PATAN_CHANGED_FILES.md` to review the full changed-file list.

## Current local app

App: http://localhost:8081 — API health: http://localhost:5000/api/health — Swagger: http://localhost:5000/api-docs

Read `backend/.local/LOCAL_LOGIN.txt` locally for the learner/Admin password. Admin is required for Analytics and reports. The practice video, course and grading data are local examples. Start/stop scripts manage the separate PostgreSQL port 55444; do not point them at a team database. This run used background Node services; their tracked process IDs are included in the ignored local launcher state.

## Apply code on another checkout

Merge source changes and preserve your own settings. In backend, install dependencies and generate Prisma with `npx prisma generate`. For an existing team database with the earlier LMS schema, review and apply `backend/lms/day7-migration.sql` once inside a transaction using your normal migration process. It adds only LmsReportDelivery and its unique period index. If the original LMS migration was never applied, review/apply `backend/lms/migration.sql` first. Do not use a destructive schema reset. The local launcher handles its own separate local table check.

The API worker processes report delivery every 10 seconds. Enable reports only after setting approved values locally:

```dotenv
LMS_REPORTS_ENABLED=true
LMS_REPORT_RECIPIENTS=approved-address@example.invalid
LMS_REPORT_CADENCE=weekly
LMS_REPORT_UTC_HOUR=9
```

Replace the example address with approved recipients. SENDGRID_API_KEY and FROM_EMAIL must already be configured locally. Cadence may be weekly, monthly or quarterly. At/after the configured UTC hour, the worker sends the previous completed UTC period once for that period key; it catches up to the immediately preceding period after downtime. It does not automatically backfill every missed period. Failed jobs retry up to four times; stale claims recover after five minutes. Delivery is at least once across a provider-accepted/database-failure window, so reconcile with provider logs if that occurs. SENT means provider acceptance, not inbox receipt. GET /api/lms/analytics/report-status exposes configuration readiness and delivery states to Admin without recipient addresses.

## Client branding and attendance

Copy branding.example.json to a private local configuration folder. Replace every placeholder, add actual approved PNG/JPEG logo (and optional signature image), then set approved=true after client approval. Relative image paths resolve beside that JSON. Set LMS_BRANDING_FILE to its absolute path. Production and LMS_REQUIRE_APPROVED_BRANDING=true reject missing/unapproved branding. Certificate logo is placed at PDF point (50,40), fit within 130×56. No real logo was supplied; the archived sample is visibly labelled pending approval.

LMS_ATTENDANCE_FILE reads an authoritative JSON roster matching attendance.example.json. Include every expected learner/session, including absences. Use environment=staging or production only for the corresponding real export and give a traceable source. The local-fixture option is rejected outside LMS_LOCAL_DEVELOPMENT=true. Current provisional definition: (PRESENT+LATE)/(PRESENT+LATE+ABSENT); EXCUSED excluded. Obtain the team's approval of this definition before client sign-off. The existing mock attendance endpoints were not used as production evidence. Refresh the roster atomically through the team's trusted data pipeline; this implementation does not invent an upstream attendance endpoint.

## Run verification

From backend:

```powershell
npm run test:patan
npm run test:ci
npm run test:patan:db
npm run sample:certificate
```

LMS_TEST_DATABASE_URL must be an isolated test database with the delivered Prisma schema. Cloud adapters in that suite are stubbed and no real emails are sent. The sample command is guarded for the dedicated local environment.

For the analytics seed, set LMS_BASELINE_DATABASE_URL to an **empty localhost database named patan_day7_validation** with the delivered schema; run `npm run baseline:day7`. The script refuses an occupied database. The already generated workbook and data JSON contain the real local observations from this run; rerunning the seed is unnecessary.

Real sandbox benchmark: configure the approved JUDGE0_URL/auth and language IDs, then LMS_STRESS_URL and a signed learner LMS_STRESS_TOKEN locally. Run `npm run stress:patan -- --edge-cases`. It launches 20 requests (five/language), then timeout and inert shell/XSS output probes. On the sandbox host set LMS_JUDGE0_CONTAINER for Docker CPU/memory samples. For stopped-service acceptance an operator must first stop the approved non-production Judge0 instance, run `npm run stress:patan -- --expect-unavailable`, then restore it. No shared container is stopped by this runner. Increase LMS_STRESS_CONCURRENCY only through approved capacity testing, respect rate limits and archive each run separately. Error responses are never treated as successful execution latency. HTTP timeout confirms the API deadline; remote process termination additionally needs Judge0-host observation.

Real staging E2E is opt-in: configure LMS_E2E_ENVIRONMENT=staging, LMS_E2E_DATABASE_URL, LMS_E2E_RECIPIENT (an existing staging learner), approved branding, Judge0, S3, SendGrid and LMS_APP_URL. `npm run e2e:day7` creates a retained staging course/enrollment fixture, grades MCQ plus real code, generates/uploads/emails/downloads the PDF and records elapsed time. It does not verify payment webhook unlocking. It only claims full email receipt after LMS_E2E_EMAIL_RECEIPT_FILE is provided with recipient-confirmed JSON:

```json
{"certificateNo":"ACTUAL_CERTIFICATE_NUMBER","receivedAt":"ACTUAL_UTC_TIMESTAMP","link":"https://YOUR_APP/learner/certificates/ACTUAL_ID"}
```

Use only values confirmed from the actual inbox. Without staging settings the runner records NOT_RUN and performs no staging writes or email. Review the actual staging PDF and verify file download/share on both Android and iOS separately before final sign-off.
