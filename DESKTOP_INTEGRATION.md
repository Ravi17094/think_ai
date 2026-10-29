# Updated Desktop integration — use the present project style

The current project.zip is the base. Its mobile screens, styles, authenticated API,
completion/security rules and data models were retained. Older Desktop task archives
supplied missing hook patterns, test scenarios, request-field conventions and recordings.

## What was integrated

- Seven named hooks are now used by the actual app: useCoursePlayer,
  useAssessmentResults, useCertificate, useAnalytics, useCodeExecution,
  useLearnerProfile and useProgressSync.
- Existing screen behavior was moved into these hooks with current numeric IDs,
  bearer authentication, storage, concurrency/race guards and present API envelopes.
- Results/profile/certificate rendering, PNG capture failure, player completion/bar,
  real reconnect queue lifecycle and profile calculation tests were added, adapted
  from the older Desktop test scenarios.
- Course/module/lesson CRUD, two-sibling reordering and enrollment status/delete
  have HTTP contract tests and a new real PostgreSQL integration test.
- Execution accepts both sourceCode/testCases/expectedOutput and the older
  source_code/test_cases/expected_output contract. Conflicting aliases are rejected.
  OpenAPI and Postman include that compatibility.
- 32 supplied reference clips were recovered into deliverables/reference-demos.
  They remain explicitly labelled as recordings of older versions, not fresh acceptance.
- Start-Preview.ps1 and a same-origin web/API/video preview server support laptop
  and same-Wi-Fi phone browser output without changing the main product UI.
- Local certificate generation is now available with explicit LMS_CERTIFICATE_STORAGE=local
  plus LMS_LOCAL_DEVELOPMENT=true in development. Eligible certificates are saved privately
  and downloaded with a five-minute signed link. It is refused in production. Local-ready
  jobs do not attempt cloud email. See CERTIFICATE_LOCAL_MODE.md for the actual verified fix.

## Fresh verification, 27 October 2026

- Mobile TypeScript: passed.
- Mobile Jest: 475 tests / 45 suites passed.
- Backend LMS: 166 tests passed.
- Existing backend CI: 25 tests passed.
- Real isolated PostgreSQL 18: 15 checks passed, including new CRUD/order/status lifecycle.
  The original learner journey uses injected Judge0/S3/mail adapters; it does not send
  actual email or establish real cloud delivery.
- Expo web export: passed. Actual local browser login/workspace, player notes,
  assessment submission/grading/results and profile loaded successfully. A mobile-sized
  browser also logged in through the laptop LAN address; no uncaught page errors.
  This is browser evidence, not physical-phone or native-feature acceptance.

Initial sandbox runs could not connect to loopback test servers; the same tests passed
with the required local networking permissions. One new UI test assertion was corrected
to account for both the total score and the per-question score displaying the same value.

## Still needs real inputs or acceptance

The Desktop payment implementations are demo/in-memory variants, not an approved
verified-payment-to-Prisma-enrollment contract. They were not substituted for the current
locked-access implementation. Real payment integration, approved client media/MD5/curriculum
and certification rules, client branding, actual S3/email/inbox delivery, staging analytics
and report recipients, production scaling threshold and native device acceptance remain open.

Existing NOT_RUN/PENDING reports were preserved. No cloud, payment, branding or production
acceptance was invented. Reference demos do not establish updated/native behavior.
The separate legacy React web frontend was not migrated to the mobile LMS contract in this
change; the verified browser preview is the actual React Native app exported for web.

## Laptop and phone browser preview

1. Extract the ZIP to its own folder. Install Node.js and PostgreSQL 18 if absent.
2. In backend, run npm install. In mobile, run npm install. Existing dependencies can be reused
   when running this prepared workspace; node_modules is not bundled in the deliverable ZIP.
3. From the think_ai folder run:

   powershell -ExecutionPolicy Bypass -File .\Start-Preview.ps1

4. Open http://localhost:8086 on the laptop. The launcher prints same-network phone URLs.
5. On a phone on the same Wi-Fi, open the matching laptop-IP URL in Chrome/Safari.
   Allow this local server on the private Wi-Fi network if Windows prompts.
6. Local learner/Admin details are generated in backend/.local/LOCAL_LOGIN.txt.
7. Stop this preview with Stop-Preview.ps1. Use Start-Preview.ps1 -Rebuild after source edits.

The launcher creates its own local preview database/accounts and preserves existing .env
configuration by refusing to replace configuration belonging to another environment.
Judge0, S3 and email are unconfigured by default. The supplied practice lesson is local
test content. PNG file share, RNFS downloads/background behavior and native share sheets
require an Android/iOS development build; browser output does not establish those features.

For native Android work use the mobile package's npm run android after setting up the
Android SDK and a reachable API URL. API_BASE_URL must use the laptop's reachable address
for a physical device; localhost on the phone means the phone itself. This is separate
from the ready same-origin browser preview.
