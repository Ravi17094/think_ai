> **Latest 26 October 2026 verification:** Real **local Judge0 execution is now verified**: 18 acceptance checks, 20 concurrent executions, concurrent sanitizer probes, remote timeout termination and stopped-service/restart checks passed. Backend **148 LMS + 25 CI tests** and mobile **401/38 suites + TypeScript** passed. Real certificate S3/email/client branding remains **PENDING**. Read [PATAN_ITEMS_1_2_STATUS.md](PATAN_ITEMS_1_2_STATUS.md). Earlier sandbox-unavailable-only results below are historical.

# Patan: security fixes and acceptance status

Updated 26 October 2026. Changes are saved directly in the existing think_ai checkout. This report supersedes older local test counts. No live sandbox, S3, inbox, client-content, staging-baseline or native-device acceptance is claimed.

## Verification actually run

| Required check | Before changes | After changes |
| --- | --- | --- |
| npm run test:patan | 35 passed, 0 failed | 135 passed, 0 failed |
| npm run test:ci | 25 passed, 0 failed | 25 passed, 0 failed |
| Mobile npm run typecheck | Passed | Passed |
| Mobile npm test -- --runInBand | 390 passed / 37 suites | 401 passed / 38 suites |

Additional checks: Prisma schema validation and client generation passed. The real isolated PostgreSQL journey passed 14 tests, including HTTP learner self-unlock denial and persisted completion-rule overrides. Its Judge0, S3 and mail adapters are injected test adapters. The Expo production web export passed. Running local HTTP checks denied 48 unauthenticated/Learner requests across 24 mutation endpoints, rejected direct Admin unlock, and confirmed unconfigured callbacks fail closed. The running web server served the updated bundle; this is not browser visual or native-device acceptance.

The unavailable-sandbox runner sent 20 real requests (5/language) to the local API, received friendly 503s, and confirmed API health. It records sandbox execution NOT_RUN; all successful-execution p50/p95/p99 values are null. This does not prove a remote 30-second kill or under-load sanitization. The staging certificate runner returned NOT_RUN and enumerated missing configuration without creating staging records, sending email or uploading files.

## Security changes

- Ten legacy router files now enforce strict database-backed identity and route-level authorization before validators/controllers. The new LMS-specific helper rejects demo headers and stale/forged role claims; unrelated teammate auth helpers retain their behavior.
- Course/module/lesson/batch/enrollment/template/coding-authoring mutations require Admin (Superadmin inherits Admin). Learner assessment/code paths validate enrollment email, active unlocked access, course, question, test case, attempt and expiry. Hidden inputs/answer keys are stripped from legacy learner responses.
- The canonical assessment start/submit aliases use the existing timed, owned LMS service. Its existing staff ownership override remains; learner ownership is enforced from database identity.
- Judge0 and recording callbacks use different dedicated shared secrets, constant-time comparison, and no user-JWT/query/body fallback. Configure JUDGE0_CALLBACK_SECRET / x-judge0-callback-secret and RECORDING_CALLBACK_SECRET / x-recording-callback-secret, each at least 32 non-whitespace characters. Stock Judge0 does not supply these custom headers: a trusted authenticated relay/provider integration is required for optional callbacks; polling remains available. Missing configuration returns 503; missing or invalid configured credentials return 401.
- The existing duplicate session-start registration was removed. The current app mounts sessionRoutes at /api/sessions while that router declares /sessions, so the live path is /api/sessions/sessions. This integration path was preserved.
- certificateTemplateRoutes is not mounted by this app. It was secured and its previously missing validators were fixed/tested standalone; it was not silently enabled.

## Pending-code fixes implemented and tested locally

1. **Execution:** JUDGE0_API_URL is supported alongside JUDGE0_URL; invalid language IDs fail before a request. Stress verification preserves the primary 20-request four-language percentiles and adds a bounded concurrent batch (one timeout + 19 malicious-input sanitizer probes). Proxy timeout alone cannot count as remote termination. Optional host metrics span both batches. These branches are regression-tested; actual sandbox measurements remain pending.
2. **Email:** certificate/report dispatch now has durable PREPARING and DISPATCHING boundaries, conditional leases and a stable delivery_key. Confirmed rejection can retry. Crash-after-send, timeout, lost acknowledgement and expired in-flight dispatch become UNKNOWN and never resend automatically. Stale certificate generators cannot reopen SENT/UNKNOWN jobs. SendGrid's real adapter requires HTTP 202 and has a bounded network timeout; the old dev-success adapter is not injected into LMS certificates.
3. **Receipt evidence:** the staging runner checks matching certificate/link, valid arrival timestamp, submission-to-email latency and PDF-flow latency. Missing, late, earlier, future or mismatched receipt evidence cannot pass. These validation tests do not prove real inbox delivery.
4. **Payment safety:** no mounted /webhooks/payment or POST /payments/intent implementation exists in this checkout. The legacy direct course-access route and its service now fail with PAYMENT_WEBHOOK_REQUIRED, including for Admin. Learners cannot self-unlock through legacy CRUD or canonical staff endpoints. Production payment integration is still pending; no replacement payment contract was invented.
5. **Rules:** course completion defaults to 80%, lesson to 90%, assessment pass to 60% and attempts to 3 in Prisma. Runtime reads these fields. Staff can update course/lesson fields through existing APIs and assessment rules through PATCH /api/lms/admin/assessments/:id/rules. Real PostgreSQL tests proved persistence and changed lesson completion behavior; learner overrides fail. Older offline caches retain their original 90% lesson rule until refreshed.
6. **Mobile/native readiness:** no TODO, FIXME or hardcoded mock-data import/path was found in mobile/src/lms runtime files. Fixed iOS background completion being released before file verification/rename/metadata commit, and recovery overwriting concurrent downloads. Automated lifecycle/interleaving tests pass. RNFS requires a development/native build, not Expo Go. The existing SDK51 Objective-C plugin and reviewed RNFS/Expo APIs match installed versions. Device reachability, OS background/force-stop, actual file permissions and sharing/cancellation remain untested. Shared certificate links intentionally open an authenticated owner route; they are not public verification URLs.

SendGrid has no atomic transaction with this database or guaranteed idempotent send. The safety policy trades automatic at-least-once retry of ambiguous attempts for prevention of duplicate dispatch. UNKNOWN may mean unsent or accepted. Reconcile its delivery_key with provider events/logs before any operator-approved resend; do not reset it blindly to PENDING. No lossless exactly-once email guarantee is claimed.

## Acceptance still PENDING and exact inputs

| Item | Required input/action |
| --- | --- |
| Real execution and capacity | Approved JUDGE0_API_URL (or JUDGE0_URL), supported JUDGE0_LANGUAGE_PYTHON/JAVASCRIPT/JAVA/CPP IDs, optional auth configured locally, approved learner token/API target, and access to Judge0 host CPU/RAM metrics. Run npm run stress:patan -- --edge-cases against the real non-production sandbox. |
| Certificate S3/email and under-30s receipt | Approved private AWS_S3_BUCKET or LMS_CERTIFICATE_BUCKET; AWS_REGION or AWS_S3_REGION; IAM role/profile or standard local AWS credentials; bucket CORS; verified SENDGRID_API_KEY and FROM_EMAIL; approved LMS_APP_URL; dedicated staging LMS_E2E_DATABASE_URL, existing LMS_E2E_RECIPIENT, LMS_E2E_ENVIRONMENT=staging; matching actual inbox receipt via LMS_E2E_EMAIL_RECEIPT_FILE. Approved branding is required by the production-template guard. |
| Payment unlock | Janadeep's actual /webhooks/payment and POST /payments/intent implementation/branch, signature and idempotency contract, identity/enrollment mapping and approved test accounts. Direct unlock stays disabled until integrated. |
| Content and completion sign-off | Approved client manifest with real media access, MD5/size/duration, ordered curriculum and answer/explanation keys, plus approved certification thresholds. Then run npm run verify:content -- <approved-manifest>. |
| Android/iOS acceptance | Your real development builds/devices or emulators (and macOS for iOS) with approved reachable media/API. Verify offline/quota/delete, background completion, force-close drafts, reconnect/conflicts and share/cancel. |
| Real analytics baseline | Approved staging DB, authoritative attendance/reporting source and independently checked manual counts. Existing analytics-baseline-report.xlsx remains explicitly synthetic local evidence. |
| Scheduled reports | Confirmed report recipients, schedule and verified sender. LMS_REPORTS_ENABLED remains false; no scheduled client report was enabled or sent. |
| Client certificate branding | Real logo asset, accreditation wording, signatory details/signature and brand guide. Then regenerate and visually verify logo (50,40), fitted text/signature and actual device sharing. Existing sample PDF is not client-approved evidence. |
| Internal callback wiring | Dedicated per-service secrets and matching trusted relay/provider header configuration. User bearer tokens cannot authorize callbacks. |

Keep all real credentials in local environment/approved credential storage, not chat or source files. Missing inputs above were confirmed from configuration presence only; secret values were not included in reports.

## Migration and handover

The additive backend/lms/security-acceptance-migration.sql adds Lesson.completionThreshold with default 90; it was applied to patan_local and patan_day7_integration only. Review and apply it to your approved staging database, then run npx prisma generate, before deploying this schema/code. Start-Patan.ps1 applies the additive column to its isolated local database. Existing teammate schemas/data were not reset. Local services were started and their listeners registered with the existing stop/start launcher.

See PATAN_SECURITY_CHANGED_FILES.md / .json for every changed source, test, report and guide. Generated Prisma-client and ignored local runtime outputs are listed separately there. No client manifest, approved certificate PDF, staging workbook or real-service benchmark was manufactured.
