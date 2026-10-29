# Local setup and handover

For the combined Tasks 1–4 delivery, start with `../START_HERE.md` and use `PATAN-TASKS-1-4.md` for current verification status.

## What you received

The ZIP contains the complete edited project, web and React Native screens, backend routes, Prisma schema/migration, shared hooks, tests, Postman collections, four demo recordings, screenshots and verification logs. Dependencies are restored with `npm ci`; caches and passwords are excluded.

Start with a short path such as `C:\Projects\think_ai`. Keep `backend`, `frontend`, `mobile` and `shared` together. Use Node.js 22.13 or newer (Node 24 tested). The React Native app uses the project's Expo SDK 51 / React Native 0.74 versions.

## 1. Create an empty local PostgreSQL database

Use PostgreSQL already installed on your computer, or Docker:

```powershell
docker compose -f docker-compose.lms.yml up -d
```

The Docker example uses database `thinkz`, user `thinkz`, password `thinkz_local`, on localhost:5432. If another PostgreSQL service already occupies that port, use that installation with a new empty database or change the Compose port and DATABASE_URL together.

For the PostgreSQL 18 installation found on this computer, open pgAdmin, connect using your existing PostgreSQL administrator password, and create a new empty database named `thinkz_lms`. Do not select a database containing another project's data. Your DATABASE_URL then looks like `postgresql://postgres:YOUR_PASSWORD@localhost:5432/thinkz_lms`; URL-encode special characters in the password.

## 2. Configure and initialize the backend

In a terminal at the extracted project:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Edit `.env`. Set DATABASE_URL, ACCESS_TOKEN_SECRET, JWT_SECRET (same as ACCESS_TOKEN_SECRET), SESSION_SECRET, and PORT=5001. Choose long random secret values. For the local walkthrough, also set:

```text
LMS_LOCAL_DEMO=1
LOCAL_SEED_PASSWORD=YOUR_OWN_PASSWORD_AT_LEAST_12_CHARACTERS
LMS_MEDIA_URL=http://localhost:5001/media/lesson.mp4
```

Then run:

```powershell
npx prisma generate
npm run db:init:fresh
npm run seed:lms:local
npm start
```

The fresh initializer refuses non-empty schemas. The original project contains a duplicated initial migration; the initializer creates the current schema and records the six checked-in migrations as applied, including playback versions and results/certificate delivery. Subsequent migrations can use `npx prisma migrate deploy`. Do not run the old migration chain directly on an empty database.

The local seed creates a course, two lessons, a six-minute assessment, an unlocked enrollment, and these accounts:

| Account | Email | Password |
|---|---|---|
| Administrator | admin@thinkz.local | Your LOCAL_SEED_PASSWORD |
| Learner | learner@thinkz.local | Your LOCAL_SEED_PASSWORD |

It refuses to overwrite existing sample accounts or progress. Course/assessment IDs are printed when seeding. Public registration creates learner accounts only; staff accounts are provisioned through administrative tooling or the explicit local seed.

Check `http://localhost:5001/api/health`. The eight-second MP4 fixture is served at `/media/lesson.mp4` only when local demo mode is enabled outside production. For a real deployment, turn off LMS_LOCAL_DEMO and provide hosted lesson media.

### Existing project database

Make a backup first. Inspect `_prisma_migrations` and compare the actual database against the original project schema. The LMS upgrade adds Module.order, notes, playback position and LearnerAttempt, and normalizes ordering. If the original history is already correctly baselined and only the LMS migration is pending, use `npx prisma migrate deploy`. If previous migrations are missing from history or the schema has drifted, establish the baseline against the actual database before applying the upgrade. Do not use `db:init:fresh`, reset, or blindly mark missing migrations as applied on existing data. The automated upgrade verification covers an original-schema fixture, not an unknown existing database.

## 3. Run the web app

Open another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, sign in as the learner, and open the enrolled course. The player route is `/learner/courses/COURSE_ID/play`; assessments are under `/learner/assessments`. The Vite proxy uses backend port 5001. The course ID is printed by the seed.

## 4. Run the React Native app

Open another terminal:

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
npm start
```

Set EXPO_PUBLIC_API_URL according to where the app runs:

| Target | API URL |
|---|---|
| Expo web on this PC | http://localhost:5001/api |
| Android Studio emulator | http://10.0.2.2:5001/api |
| Physical phone on the same Wi-Fi | http://YOUR_PC_LAN_IP:5001/api |

For a phone or emulator, set backend LMS_MEDIA_URL to a URL reachable from that target **before the first seed**. Existing lesson URLs can be edited by the administrator using PATCH `/api/lms/lessons/:id`. Restart Expo with `npx expo start --clear` after changing mobile environment variables.

Use an Expo Go/development client compatible with SDK 51. Get the matching Android client from [Expo Go downloads](https://expo.dev/go); the current store client may not support this older project. For a native development build, install Android Studio/SDK and use `npx expo run:android`. iOS simulator/local builds require macOS and Xcode (`npx expo run:ios`); this Windows computer cannot run them. For app store distribution, signing and release builds are separate from this source-code handover.

On the dashboard, choose **Open enrolled courses & assessments**, sign in with learner@thinkz.local and your seed password, then open the course or assessment. Allow backend access on your private network if Windows Firewall prompts. For device testing, confirm the API health URL opens in the phone browser first.

## 5. Configure Judge0 execution

No Judge0 server or API credential was supplied. The app returns a clear 503 until a runner is configured. Code runs on Judge0; it is not executed on the LMS host.

For self-hosting, follow the official [Judge0 CE deployment guide](https://github.com/judge0/judge0/blob/master/CHANGELOG.md#deployment-procedure). It specifies a supported Linux host, Docker/Compose and cgroup configuration. Use the patched release 1.13.1 or a newer compatible maintained release, set unique Redis/PostgreSQL passwords in its configuration, and start its database, Redis and worker/server services. A Linux VM/server is the documented path; plain Windows without Docker is not a runner.

Point backend JUDGE0_URL at the runner's API base URL, without `/submissions`. If its X-Auth-Token authentication is enabled, put the token in JUDGE0_API_KEY. Keep the runner on a private/trusted network and restart the backend after configuration changes. The proxy uses the CE language IDs for Python, JavaScript, Java and C++.

Then, in `backend`:

```powershell
$env:RUN_JUDGE0_LIVE='1'
npm run test:judge0
```

This checks real execution for four languages and timeout behavior. The service's sandbox wall/CPU limits bound execution; the proxy separately caps the complete request at 30 seconds. A client timeout alone is not evidence that a remote queued job was killed. The live test results must be reviewed on the actual runner before claiming that verification is complete.

## 6. Tests and Postman

```text
backend:  npm run test:lms
backend:  npm run test:postgres       (set LMS_TEST_DATABASE_URL first)
frontend: npm run test:learning
frontend: npm run build
mobile:   npm test -- --runInBand
mobile:   npm run typecheck
mobile:   npx expo export --platform web --output-dir dist-learning
```

`test:lms` resets its isolated SQLite test database. `test:postgres` creates and removes only a random lms_verify_* schema in the supplied PostgreSQL database; use a disposable local database. It applies the LMS upgrade to pre-upgrade fixtures, checks ordering/playback backfill and schema equivalence, then runs HTTP/Prisma tests.

Import both JSON collections plus the environment from `docs/postman`. Set credentials, sign in, and set course/module/lesson/batch/enrollment/assessment IDs from your own seed or API responses. Run learner and administrator requests with the appropriate tokens.

The original `backend/authFlow.test.js` is a legacy manual script that attempts public administrator signup; that behavior is intentionally blocked now. Use the documented LMS suite and explicit local seed for these deliverables.

## 7. Device acceptance checklist

The source, component tests and Expo web preview are delivered. These native checks are pending because no phone/emulator was available:

- On Android and iOS, play/pause/seek the video; reopen the app and verify saved position and notes.
- Complete a video and verify the course percentage, including after reload.
- Change lessons and verify the current lesson highlight and lesson-scoped notes.
- Disconnect Wi-Fi while editing notes; verify the offline message and synchronization after reconnecting.
- Answer, flag and navigate between assessment questions; wait at least 30 seconds and reopen to verify the draft.
- Verify the five-minute warning, timer continuity, unanswered confirmation and final submission.
- Repeat background/foreground transitions and a network interruption near expiry; offline work must not extend the server deadline.

Record outcomes separately for each device/OS. Existing phone-sized demo videos show Expo web, not an Android or iOS device.

## Handover status

### Mobile lockfile correction

The updated `think_ai.zip` contains the repaired mobile package-lock.json. If you already extracted an earlier download and `npm ci` reports missing Babel packages, run these commands in `mobile`:

```powershell
npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund
npm.cmd ci
```

Then continue with mobile environment configuration and `npm.cmd run web` or `npm.cmd start`. No database reinitialization is needed.

All requested code areas, tests, API collections and demo recordings are included. PostgreSQL migration, backfill, fresh install and HTTP integration were verified locally. Live Judge0 execution and Android/iOS device acceptance are not yet verified. Assessment grading and the standalone proxy accept the four configured languages; each coding question restricts its allowed languages. Descriptive answers require instructor review. See SUBMISSION.md for exact results.
