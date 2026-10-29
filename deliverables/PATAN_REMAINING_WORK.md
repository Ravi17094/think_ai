# Patan: remaining acceptance work

Updated 27 October 2026. Core LMS features and the security, completion-rule and Playground fixes are implemented in the existing Desktop checkout. **The full Day 1-7 assignment is not yet 100% accepted.** Local tests cannot substitute for real client, service, integration or device checks.

## Verified locally

- Security: database-backed authentication, Admin authorization, learner ownership, protected callbacks and learner self-unlock denial. The previously run isolated PostgreSQL journey passed 14 checks. Direct course unlock stays disabled until the approved payment integration exists.
- Local Judge0: 18 real acceptance checks and 20 concurrent four-language executions passed; sanitizer probes, actual remote timeout termination, stopped-service behavior and restart were verified. This establishes the measured local run, not production capacity.
- Current backend suites: 148 LMS tests and 25 CI tests passed. Mobile TypeScript passed; full mobile suite: **461 tests / 41 suites passed**.
- Playground: ten real Python/JavaScript/Java/C++ program checks passed, including stdin, functions, arrays, loops, if/else and genuine error reporting. Updated drafts, history, editor synchronization and input guidance are documented in [PLAYGROUND_UPDATE.md](PLAYGROUND_UPDATE.md).

## Still PENDING

| Work | What is needed | Acceptance required |
| --- | --- | --- |
| 1. Real certificate storage and email | Approved staging database and existing test learner/recipient; private S3 bucket, region, IAM access and CORS; verified SendGrid sender/key; approved app URL; actual inbox receipt for the same certificate/link. Production branding is also a prerequisite. | Run assessment → grade → certificate → real S3 → real email → authenticated download. Prove PDF availability and inbox arrival within 30 seconds. The current staging report is `NOT_RUN`; no actual email or cloud object is claimed. |
| 2. Payment-to-enrollment integration | Janadeep's actual `/payments/intent` and `/webhooks/payment` implementation/branch, signature/idempotency contract, learner/enrollment mapping and approved test accounts. | Prove only the approved verified payment path unlocks access; verify retries and learner self-unlock denial together. That payment implementation is absent from this checkout. |
| 3. Client content and completion sign-off | Approved media manifest and access, MD5/size/duration metadata, curriculum order, answer/explanation keys and certification thresholds. | Run `npm run verify:content -- <approved-manifest>` and record actual hierarchy/question/media results. Prisma-backed configurable rules are locally tested; client approval is still pending. |
| 4. Native and media acceptance | Real Android/iOS development builds or emulators, macOS for iOS, and reachable approved API/media. Platform access is also needed for the real video codec matrix. | Verify controls, offline downloads/playback, quota/delete, background completion, force-close drafts, reconnect/conflicts and certificate download/share/cancel. RNFS requires a native/development build; Expo Go and web tests do not establish these results. |
| 5. Real analytics and scheduled reports | Approved staging database, authoritative attendance/reporting source, independent expected counts, confirmed recipients/schedule and verified sender. | Reconcile real KPI/date/report results and replace the explicitly synthetic local baseline. Keep scheduled delivery disabled until recipients are confirmed; no actual client report has been sent. |
| 6. Approved certificate branding | Real client logo, accreditation wording, signatory/signature and brand guide. | Regenerate the certificate and inspect logo position (50,40), fitted wording and signature block against the actual guide. The existing local sample is not a client-approved certificate. |
| 7. Final real-data demo and handover | Successful service/device checks above and the latest compatible teammate integration branches/contracts. Optional callbacks also need dedicated secrets plus trusted relay/provider header wiring. | Record the actual assigned flows and retain real evidence. A demo recording, production deployment or full acceptance must not be claimed before those checks pass. |

Keep passwords, API keys and cloud credentials in approved local configuration, never in chat or source control. A teammate or deployment administrator can supply the missing environment and client assets; installing another VS Code extension cannot replace them.

## Status references

- [PLAYGROUND_UPDATE.md](PLAYGROUND_UPDATE.md): latest local Playground behavior and test counts.
- [PATAN_ITEMS_1_2_STATUS.md](PATAN_ITEMS_1_2_STATUS.md): measured local execution and explicitly pending real certificate delivery.
- [PATAN_SECURITY_ACCEPTANCE.md](PATAN_SECURITY_ACCEPTANCE.md): security changes, locally tested rules and exact external configuration requirements. Lower historical sandbox-pending statements are superseded by its newer local-execution banner.
- [RUN_PROJECT.md](RUN_PROJECT.md): current local start instructions. Local running success does not remove the pending acceptance work above.

No completion percentage is assigned: the listed pending requirements have not been run successfully and remain open.
