> **Current 26 October 2026 setup:** Real local Judge0 is verified and running. Backend health and Expo web both returned HTTP 200. This checkout currently uses the existing local PostgreSQL database at localhost:5432/patan_local. The older Start-Patan.ps1 instructions below manage their separate localhost:55444 database and do not match the current .env. Use these commands for the current setup.

From think_ai/backend, start the prepared sandbox and then the backend:

```powershell
node lms/scripts/judge0-local.cjs start
npm start
```

From think_ai/mobile in a second terminal:

```powershell
npx expo start --web --offline --port 8081
```

Open http://localhost:8081/learner/workspace and sign in with the learner from backend/.local/LOCAL_LOGIN.txt. The current app/backend are already running; these commands are for later startup. Keep the configured PostgreSQL service running. No schema reset or new login is needed for this update.

Sandbox status/stop (from backend):

```powershell
node lms/scripts/judge0-local.cjs status
node lms/scripts/judge0-local.cjs stop
```

Stop backend/Expo with Ctrl+C in the terminals where you started them. The sandbox stop preserves its private disk, images and keys. Its ignored runtime pointer and .env credentials are local only.

Real execution checks: `node lms/scripts/verify-local-execution.cjs`. The original stress command remains `npm run stress:patan -- --edge-cases`; configure a signed learner LMS_STRESS_TOKEN locally. Optional VM resource collection uses LMS_JUDGE0_RUNTIME_CONFIG pointing to backend/.local/judge0-runtime.json and LMS_JUDGE0_CONTAINER=think-ai-judge0-workers-1. Never paste tokens into chat or commit them.

See [PATAN_ITEMS_1_2_STATUS.md](PATAN_ITEMS_1_2_STATUS.md) for actual benchmark evidence and the still-pending S3/email inputs, and [REQUIRED_SOFTWARE.md](REQUIRED_SOFTWARE.md) for software/extensions.


> **26 October 2026 update:** Security and pending-code fixes are saved in this checkout. Backend: **135 LMS + 25 CI tests passed**; mobile: **401 tests / 38 suites and TypeScript passed**; isolated PostgreSQL journey: **14 passed**; web export passed. Real sandbox/cloud/inbox, payment integration, client content/branding, staging analytics and native-device acceptance remain **PENDING**. Read [PATAN_SECURITY_ACCEPTANCE.md](PATAN_SECURITY_ACCEPTANCE.md) and its exact input table. Older counts below are historical.

> Latest update: Day 7 implementation and local checks are recorded in [PATAN_DAY7_STATUS.md](PATAN_DAY7_STATUS.md). Real staging/client acceptance remains pending.

# Patan: local project running — 23 October 2026

The updated source is saved directly in `C:\Users\enovo\OneDrive\Desktop\project\think_ai`.

## Open the app

- App: http://localhost:8081
- Swagger: http://localhost:5000/api-docs
- Backend health: http://localhost:5000/api/health

The local practice course is backed by a separate PostgreSQL 18 database. It is example content for checking the installation, not approved client curriculum. A generated 12-second H.264 test-pattern video is included for playback checks.

## Login

Open `backend/.local/LOCAL_LOGIN.txt` in VS Code. It contains the generated password for:

- Learner: `patan@local.test`
- Admin: `admin@local.test`

Use the Admin account for Analytics. The learner account is intentionally denied access to administrator analytics. The password, database connection and signing secrets remain in ignored local files and are excluded from source ZIPs.

## Start and stop later

In the VS Code PowerShell terminal, from the `think_ai` root:

```powershell
.\Start-Patan.ps1
```

To stop this project's local app, backend and database:

```powershell
.\Stop-Patan.ps1
```

The launcher preserves the local accounts and progress between runs. It creates only its separate `patan_local` database. PostgreSQL data and logs are under the per-checkout `ThinkzPatan` directory in LocalAppData, outside the OneDrive project. Existing team databases are not used. Backend and database listeners use loopback; the Expo offline server is for local development.

The launcher requires Node.js and PostgreSQL 18 at the configured path. They are available on this computer. On a different computer, install the prerequisites and run `npm install` in backend and mobile before using it. The launcher refuses to replace a backend `.env` that belongs to another environment.

## Completed in this update

- Added platform-specific `react-native-fs` video downloads and an Expo config plugin for iOS background completion callbacks. Expo/web keeps its existing filesystem fallback. Native modules require a development build; Expo Go does not contain RNFS.
- Added React Native Share for iOS PDF attachments. Android retains Expo Sharing because core React Native Share supports text, not Android file attachments. Link sharing uses React Native Share on both platforms. See https://reactnative.dev/docs/share.
- Fixed a download quota race by reserving space inside the serialized storage update. Added a simultaneous-download regression test.
- Added start/stop scripts, protected local environment/credential files with Git ignores, and generated separate local accounts and a practice course.
- Added `npm run verify:local` in backend for real HTTP and Socket.IO checks against this local instance. It uses practice data and creates an assessment attempt; do not use it as client acceptance evidence.

## Verification completed

| Check | Result |
| --- | --- |
| Mobile TypeScript | Passed |
| Full mobile suite | 359 tests passed across 34 suites |
| Backend LMS and existing CI | 39 tests passed |
| PostgreSQL 18 integration suite | 8 tests passed in a separate integration database; cloud adapters are stubbed in this suite |
| Web production export | Passed |
| iOS config plugin | Handler installation and idempotency passed using an in-memory AppDelegate fixture |
| Running local API | Real learner/Admin login, access restrictions, notes, assessment/grading, authenticated Socket.IO event and admin analytics passed; no HTTP or socket mocks |
| Missing Judge0 | Correctly returned HTTP 503 with EXECUTOR_UNAVAILABLE |
| Practice video | HTTP 206 range requests passed; browser decoded and played all 12 seconds without a video error |
| Live browser notes/progress | Save-on-blur showed Notes saved; playback completed 1/1 lessons and sync returned Up to date |
| Local restart | Stop/start verified; existing accounts and data preserved |

## Still pending before full assignment sign-off

1. Configure the approved Judge0 service; run four real languages, timeout/unavailability checks and the 20-request benchmark with host CPU/RAM metrics.
2. Configure approved private S3/IAM/CORS, email sender and app URL; verify actual certificate upload, delivered email and the complete assessment-to-download journey with timing.
3. Integrate the latest team payment/enrollment, progress, authentication and reporting contracts.
4. Obtain approved video/question manifests, verify MD5 and hierarchy, configure approved completion rules, and complete `deliverables/course-content-signoff.md`.
5. Build and test on Android/iOS with real media: downloads/quota/delete, force-close draft recovery, reconnect conflicts, sharing and cancellation. No Android SDK/JDK/adb or Docker was found at the checked default paths or on PATH. iOS builds require an appropriate macOS environment.
6. Verify actual client videos across Chrome, Firefox, Safari and Edge, record required real-data demos, and fill in the assignment submission counts and measured results.

The project is running locally. The live cloud, approved-content and native-device acceptance items above have not been marked complete.
