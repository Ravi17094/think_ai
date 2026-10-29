> **Latest 26 October 2026 verification:** Real **local Judge0 execution is now verified**: 18 acceptance checks, 20 concurrent executions, concurrent sanitizer probes, remote timeout termination and stopped-service/restart checks passed. Backend **148 LMS + 25 CI tests** and mobile **401/38 suites + TypeScript** passed. Real certificate S3/email/client branding remains **PENDING**. Read [PATAN_ITEMS_1_2_STATUS.md](deliverables/PATAN_ITEMS_1_2_STATUS.md). Earlier sandbox-unavailable-only results below are historical.

> For the current local database and sandbox startup commands, use the latest block in [RUN_PROJECT.md](deliverables/RUN_PROJECT.md). Software and extensions: [REQUIRED_SOFTWARE.md](deliverables/REQUIRED_SOFTWARE.md).

> **26 October 2026:** Latest status, actual before/after counts, migration and pending inputs are in [deliverables/PATAN_SECURITY_ACCEPTANCE.md](deliverables/PATAN_SECURITY_ACCEPTANCE.md). Security fixes are already saved here. Cloud/client/native acceptance remains pending; older verification text below is historical.

> Day 7 update: read [the latest status](deliverables/PATAN_DAY7_STATUS.md) and [setup guide](deliverables/DAY7_SETUP.md). The Desktop source is already updated.

# Patan: how to use this project in VS Code

**Local setup is ready.** Open http://localhost:8081. Find the generated learner/Admin passwords in `backend/.local/LOCAL_LOGIN.txt`. Run `Start-Patan.ps1` and `Stop-Patan.ps1` from the project root to start/stop local services. See `deliverables/RUN_PROJECT.md` for current results and remaining acceptance work.

Patan's assigned Core LMS features have been implemented in this project. Native device demos, real Judge0, real S3/email delivery, payment unlock, and client content sign-off still need your team's environment. Exact verification status is in `deliverables/PATAN_TASK_STATUS.md`. The app does not return fake success when a required service is missing.

Your open VS Code project has already been updated directly. The ZIP instructions below are for using another copy or sharing the source.

The backend and mobile dependencies are already installed in this Desktop copy. The migration and database journey have passed on a separate PostgreSQL 18 test instance. The local app is now configured and running with a separate development database and practice accounts. Approved team services still need configuration. Read `deliverables/LOCAL_VERIFICATION.md` for the current results and missing inputs.

## 1. Two ways to use the ZIP files

**Open a separate copy:** Extract `Patan_Updated_Project.zip` into a new folder. In VS Code, choose File > Open Folder and select the extracted `think_ai` folder. Keep your original clone as a backup.

**Merge into an existing clone:** Extract `Patan_Changed_Files.zip`. Copy or merge the files inside its `think_ai` folder into the same relative locations in your existing project root. Avoid nesting another `backend` folder inside `backend`. If teammates have changed a file, use VS Code Compare to merge it. Complete source files are provided, so you do not need to assemble individual snippets.

Your own `.git` directory and `.env` files stay with your clone. The deliverables do not include Git history, dependencies, nested ZIP archives or real credentials.

## 2. Start the backend

Run these commands in the VS Code PowerShell terminal from the project root:

```powershell
cd backend
npm install
npx prisma generate
```

Open `backend/.env.patan.example`. Merge the required fields into your existing `backend/.env`, or create that file if it does not exist. `DATABASE_URL` must point to your approved PostgreSQL database. `ACCESS_TOKEN_SECRET` must be the SAME secret your existing login endpoint uses. The new LMS routes accept `JWT_SECRET` only as a fallback if `ACCESS_TOKEN_SECRET` is absent.

**Database schema:** `backend/lms/migration.sql` is an additive SQL delta against the schema in your uploaded ZIP. It adds module order, lesson duration/size metadata, assessment timer/retry fields, notes, and a durable certificate delivery table. It does not drop existing tables or data. Apply it ONCE to a reviewed development/staging copy first:

```powershell
npx prisma db execute --file lms/migration.sql --schema prisma/schema.prisma
npx prisma generate
npm start
```

If teammates have changed the Prisma schema since this ZIP, merge their schema first and regenerate a migration. Do not run this SQL twice or blindly use `migrate reset`. The repository's historical migrations do not cover every model in the uploaded schema, so this change is supplied as a standalone additive delta rather than guessing your deployed migration history.

On a NEW EMPTY development database only, you can use `npx prisma db push` instead of the delta. Do not use that shortcut against a shared production database.

Open `http://localhost:5000/api/health` and `http://localhost:5000/api-docs`. The Patan operations are tagged **Patan LMS**. The standalone contract is `http://localhost:5000/api/lms-openapi.json`. Postman collection: `deliverables/Patan-LMS.postman_collection.json`; set `baseUrl`, a real `token`, and real IDs.

## 3. Start the mobile app

Open a second terminal from the `think_ai` root:

```powershell
cd mobile
npm install
```

Merge `mobile/.env.patan.example` into `mobile/.env`. Choose the API URL for your device:

| Where app runs | API URL example |
| --- | --- |
| Browser on your PC | `http://localhost:5000/api` |
| Android emulator | `http://10.0.2.2:5000/api` |
| Phone on same Wi-Fi | `http://YOUR_PC_LAN_IP:5000/api` |

If your backend uses port 5001, use port 5001 in the API URL as well.

Then:

```powershell
npx expo start --clear
```

Press `w` to open web. For a native Android build with Android SDK/JDK configured, use `npx expo run:android`. If Expo Go reports an SDK mismatch, use an Expo SDK 51 compatible development build. The existing project remains on SDK 51; this delivery does not attempt a framework upgrade.

Sign in with an existing backend account. The initial **My learning** screen now uses live `/api/lms` APIs. Learners see courses, profile, downloads and playground. Admin/Superadmin accounts open the separate Admin workspace for analytics and reporting. The Community dashboard is the pre-existing teammate surface and still uses the uploaded project's existing API configuration; this assignment does not claim all teammates' screens have been migrated from mocks.

## 4. Prepare real data

- Learner's `User.email` must match `Enrollment.studentEmail`.
- Enrollment must have `courseAccess=true`, set by the approved payment/enrollment workflow. Learners cannot unlock courses themselves through the new API.
- Course and batch must be ACTIVE, and enrollment must be ENROLLED, ACTIVE or COMPLETED.
- Every video lesson needs a real `videoUrl`, trusted `durationSeconds`, and `videoBytes` from the approved content manifest. No duration/size is guessed from the device. Size is required for offline quota checks and complete-download verification.
- Set module and lesson `order`; use the staff order endpoints to reorder every child atomically.
- MCQ questions need exactly one correct option. Coding questions need server test cases and supported languages.
- Current defaults: course completion threshold 80%, lesson watched threshold 90%, assessment pass percentage 60%, maximum 3 attempts. Course threshold and assessment pass/attempt fields are configurable in Prisma/staff APIs. Confirm all defaults against the client's certification rules before signing off.

New staff CRUD endpoints are under `/api/lms/admin`. See Swagger and Postman for full request examples. Assessment authoring continues through the existing staff APIs in the uploaded project. Your new learner screens never receive answer keys before grading.

## 5. Features and exact code locations

| Feature | VS Code location under `think_ai` |
| --- | --- |
| Main app/provider + added routes | `mobile/src/App.tsx` |
| Shared primary button text contrast | `mobile/src/components/common/AppButton.tsx` |
| Route params and deep links | `mobile/src/navigation/types.ts`, `mobile/src/navigation/linking.ts` |
| Live workspace | `mobile/src/lms/screens/HomeScreen.tsx` |
| Course player, lesson list, notes, downloads, progress bar | `mobile/src/lms/screens/CoursePlayerScreen.tsx` |
| Assessment navigation, warning timer, flags, confirmation | `mobile/src/lms/screens/AssessmentTakingScreen.tsx` |
| 30-second draft saving, expiry and resume | `mobile/src/lms/useAssessment.ts`, `mobile/src/lms/storage.ts` |
| Score/result explanations and retake | `mobile/src/lms/screens/ResultsScreen.tsx` |
| Certificate PDF preview, PDF/PNG/link sharing | `mobile/src/lms/screens/CertificateScreen.tsx`, `mobile/src/lms/certificateShare.ts` |
| KPI/trend/date filtering/sort | `mobile/src/lms/screens/AnalyticsScreen.tsx` |
| Monaco/native WebView editor and text fallback | `mobile/src/lms/CodeEditor.tsx`, `mobile/src/lms/CodeEditor.web.tsx`, `mobile/src/lms/editorHtml.ts` |
| Code run, outputs and 50-entry history | `mobile/src/lms/screens/PlaygroundScreen.tsx` |
| Profile, stats, activity, settings | `mobile/src/lms/screens/ProfileScreen.tsx` |
| Download/quota/recovery management | `mobile/src/lms/downloads.ts`, `mobile/src/lms/screens/DownloadsScreen.tsx` |
| Reconnect and background progress sync | `mobile/src/lms/LmsProvider.tsx` |
| Sync indicator on original learner dashboard | `mobile/src/screens/learner/LearnerDashboardScreen.tsx` |
| API transport and types | `mobile/src/lms/api.ts`, `mobile/src/lms/types.ts` |
| Authenticated LMS API and staff CRUD | `backend/lms/router.js`, `backend/lms/auth.js`, `backend/lms/schemas.js` |
| Completion, ownership, assessments and worker | `backend/lms/service.js`, `backend/lms/completion.js` |
| Judge0 sandbox adapter | `backend/lms/executor.js` |
| Certificate PDF/S3/signing/email retries | `backend/lms/certificates.js` |
| Backend install + worker startup | `backend/app.js`, `backend/server.js`, `backend/lms/index.js` |
| Schema and additive SQL | `backend/prisma/schema.prisma`, `backend/lms/migration.sql` |
| OpenAPI and Postman | `backend/lms/openapi.json`, `deliverables/Patan-LMS.postman_collection.json` |
| Stress and content verification runners | `backend/lms/scripts/stress.js`, `backend/lms/scripts/verify-content.js` |

## 6. Run the tests

Backend terminal:

```powershell
npm run test:patan
npm run test:ci
```

For the optional DB integration suite, create a dedicated empty test database, sync the schema there, and set `LMS_TEST_DATABASE_URL` locally before `npm run test:patan:db`. The suite creates temporary users/courses and removes its own records. Do not point it at production.

Mobile terminal:

```powershell
npm run typecheck
npm test -- --runInBand
npx expo export --platform web
```

Optional browser UI smoke (HTTP fixtures only):

```powershell
cd mobile
npx expo export --platform web --output-dir .web-build
node scripts/serve-web-build.js 8099
```

In another terminal from `mobile`:

```powershell
node scripts/verify-patan-ui.mjs http://localhost:8099
```

These screenshots and checks use deterministic HTTP fixtures. They do not replace real-service or device acceptance. Output is in `mobile/patan-ui-artifacts`.

Live sandbox benchmark, after setting `LMS_STRESS_TOKEN` locally:

```powershell
cd backend
npm run stress:patan -- --edge-cases
```

The runner sends 20 concurrent requests across four languages and reports five samples per language with p50/p95/p99. Collect actual CPU/RAM on the Judge0 Docker/host at the same time. Proxy metrics do not measure the remote sandbox's resources.

Content verification:

```powershell
npm run verify:content -- C:\path\to\approved-client-manifest.json
```

Use `deliverables/client-manifest.example.json` as a format reference only. It is not real client data. The script downloads the approved S3 objects as streams to compute actual MD5 values; it does not assume a multipart S3 ETag is an MD5.

## 7. Integration details for teammates

- Existing legacy LMS writes and assessment/content endpoints now require a real staff JWT. Open course list/detail metadata and public certificate verification remain readable. Legacy `/courses/:id/content` is restricted because it exposes lesson content. Learner clients must use ownership-checked `/api/lms` routes. Coordinate this contract change with the web frontend team.
- Canonical aliases provided: `POST /api/assessments/:id/start`, `POST /api/progress/sync`, `POST /api/code/execute`, `POST /api/assessments/:id/submit`, `POST /api/certificates/generate`. Payloads are the same as their `/api/lms` versions. Submission requires an `attemptId` created by `/api/lms/assessments/:id/start`.
- Socket.IO namespace `/lms`: connect with `{auth:{token}}`. The server joins `user:<database user ID>` automatically and emits `assessment:submitted`. No client-controlled room membership is accepted. Results also poll HTTP, so they do not depend on a teammate WebSocket server.
- Worker starts with `backend/server.js`, polls every 10 seconds, and is also kicked after submission. Do not start only `app.js`. It uses durable DB statuses, claims and crash-recovery leases for grading and certificate generation/delivery. Email dispatch uses a durable ambiguity guard: a crash after possible provider acceptance becomes UNKNOWN and never automatically resends. Reconcile delivery_key with SendGrid events before an operator-approved resend; lossless exactly-once delivery is not claimed.
- Certificate PDFs are private S3 objects under `certificates/`; the DB stores the S3 URI. GET returns a 15-minute signed URL. App/email/share links use a stable authenticated app route, so a copied link does not expire with the signed object URL.
- Allow approved app origins in S3 CORS for PDF.js preview. Native WebViews may use an opaque/null origin; verify your platform policy. If inline preview cannot load, the native PDF file download/share still works.
- iOS PDFs and links use React Native `Share`. Android PDF/image attachments use `expo-sharing` because core Share has no Android file-attachment parameter; links use React Native `Share`. PNG preview uses `react-native-view-shot`. Web supports PDF opening/download and link copying; native offline video files and PNG sharing need Android/iOS verification.
- Native video downloads use `react-native-fs` with an Expo prebuild plugin for the iOS background completion handler. The web fallback retains Expo FileSystem. Build the native app with `npm run android` or `npm run ios`; RNFS is not available in Expo Go. iOS uses a background session; Android background/force-stop behavior must be tested on device. Incomplete files are cleaned on recovery; the code does not claim a force-stopped OS process continues downloading.
- Monaco and PDF.js load pinned library assets from jsDelivr. Monaco has an editable plain-text fallback while offline. This requires CDN access; for a restricted production network, bundle/host those library assets on your approved origin.

Ready-to-send requests for your teammates: `deliverables/TEAMMATE_REQUESTS.md`.
