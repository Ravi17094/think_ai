> Historical report: see START_HERE.md and docs/PATAN-TASKS-1-4.md for the combined delivery and current verification status.

# Patan — Day 4 implementation and verification

Scope: Patan's five items on pages 5–7 of `reactNative4.pdf`. Other team members' assignments are outside this delivery. The main target is the React Native app; corresponding website controls are also included.

## Task checklist and where to see the output

| Task | App / website entry | Expected result |
|---|---|---|
| Offline lesson video | Course player → Download video; library → Downloaded lessons / website `/learner/downloads` | Progress reaches complete; reopen the saved lesson and see “Playing downloaded video”. Delete removes the file and its metadata. |
| Assessment auto-save | Enrolled course → assessment / website `/learner/assessments/:id/take` | Answers, review flags and question position are stored every 30 seconds. Reopen and choose Resume saved draft; saved state returns with the original deadline and last-saved timestamp. |
| Certificate sharing | Library → Share certificates / website `/learner/certificates/share` | Select an already issued certificate. Share the PDF attachment, generate/preview a PNG, share the image, or copy its link. Website also offers explicit downloads. |
| Offline progress | Watch a saved video or mark a reading complete while offline | Dashboard/library shows pending updates; reconnect sends `/api/progress/sync` and clears acknowledged updates. A newer overlapping server version wins. |
| Playground history | Library → Code playground and history / website `/learner/playground` | Each execution records language, source, output/error and time. Tap Restore to refill the editor. Clear requires confirmation. The oldest item is removed when the list exceeds 50. |

In the isolated browser preview, routes appear after `learning-demo.html#`. Normal website routes do not contain that prefix. Course, lesson, assessment and certificate IDs come from your own database; do not copy IDs from the screenshots.

## Design and source map

Shared state and persistence live in `shared/offline.js`, `shared/assessment.js` and `shared/learning.js`. Platform adapters supply storage, API requests, connectivity and files. This keeps queue behavior and draft recovery consistent across React DOM and React Native.

| Area | Main files |
|---|---|
| Native file downloads | `mobile/src/api/videoFiles.ts`, `mobile/src/hooks/useDay4.ts`, `mobile/src/screens/learning/DownloadsScreen.tsx` |
| Local-first video player | `mobile/src/screens/learning/CoursePlayerScreen.tsx`, `frontend/src/pages/learner/LmsCoursePlayer.jsx` |
| Assessment resume/discard | `shared/assessment.js`, native `AssessmentTakeScreen.tsx`, web `LmsAssessmentTaker.jsx` |
| Certificate PDF and image sharing | Native `CertificateShareScreen.tsx`, `backend/lms/certificates.js`, `shared/certificateImage.js` |
| Reconnect queue and indicator | `shared/offline.js`, `backend/lms/progressSync.js`, native `ProgressSyncStatus.tsx` and library, web `Day4Pages.jsx` |
| Playground history | Native `PlaygroundScreen.tsx`, web `Day4Pages.jsx` |
| Browser persistence | `shared/browserFiles.js`, `shared/browserStorage.js`, `shared/browserConnectivity.js`, `frontend/public/offline-worker.js` |
| Schema update | `backend/prisma/migrations/20261016090000_offline_progress_version/migration.sql` |

### Video files

Native downloads use `expo-file-system` with a background session, the app document directory and account-scoped AsyncStorage metadata. A transfer writes to a partial file and is promoted only after a successful HTTP response and nonempty result. Failures and interrupted records are cleaned up. Downloads for an account are serialized to avoid racing the quota. The app enforces a 512 MiB download allowance and checks a 20 MiB free-space reserve; the user can delete saved files.

Browsers use Cache Storage and object URLs instead of native document paths. Cache Storage requires localhost or HTTPS; remote video servers must allow cross-origin downloads. Production web builds include an application-shell service worker. A full browser reload while truly offline still needs acceptance testing; the development preview's offline toggle tests API loss and cached media playback within the loaded application.

### Draft recovery

AsyncStorage/localStorage holds a per-account, per-assessment draft. Edits persist locally immediately and every 30 seconds; the regular server draft also saves online. A reopen asks for Resume or Discard. Successful submit clears the draft. Discard clears the answers and stores a small deadline-bound tombstone so an old server draft cannot reappear after an offline discard. Malformed local records are deleted safely. Cached assessment definitions allow offline reopening, while the original server deadline continues rather than resetting the timer.

### Sharing

Native certificate links use React Native's Share API. PDF/PNG attachments use the operating-system file share sheet through `expo-sharing`; PNG capture uses `react-native-view-shot`. `expo-clipboard` copies the link. Web uses a canvas image and Web Share when available, otherwise file downloads. Cancelling a share is handled without claiming delivery. No certificate was sent to an external recipient during verification.

The backend lists and renders only certificates already issued to the authenticated enrollment owner. PDF requests require authentication. Copy links contain no JWT or secret. A public verification URL is used when the existing certificate has one; otherwise the link points to its authenticated learner share page. A new learner must meet the existing certificate issuance rules before a certificate appears.

### Progress conflict policy

Queue records persist across app restarts. Multiple edits for one lesson coalesce, and synchronization sends batches of up to 50. Each update includes the last acknowledged `progressUpdatedAt`. The server accepts a matching base version; a mismatch returns the newer server record. Device clocks do not choose the winner. Completion remains monotonic. Enqueueing while a request is in flight keeps the newer unsent edit and rebases it after acknowledgement. Failed requests retain the queue for retry. Notes use a separate write and do not advance the playback version.

`POST /api/progress/sync` uses the normal bearer JWT and accepts:

```json
{
  "updates": [{
    "id": "device-update-id",
    "lessonId": 1,
    "positionSeconds": 42,
    "durationSeconds": 100,
    "completed": false,
    "baseUpdatedAt": null
  }]
}
```

Responses use the existing `{ success, data }` envelope and per-update `applied`, `conflict` or `rejected` results. Only acknowledged applied/conflict records are removed; rejected records remain available for retry. Certificate routes are `GET /api/lms/certificates`, `GET /api/lms/certificates/:id` and `GET /api/lms/certificates/:id/document`.

### History

The account-scoped list keeps the newest 50 runs in FIFO order. History includes failed execution messages, which can also be restored. Source and output have size limits to avoid unbounded local storage growth. Newest runs display first, with language and local date/time.

## Verification completed on 16 October 2026

| Check | Result |
|---|---|
| Full mobile Jest suite | 338 tests / 30 suites passed |
| Shared behavior + browser hook integration | 29 tests / 3 files passed |
| PostgreSQL migration, backfill, schema comparison + HTTP API integration | Passed; 39 API tests |
| SQLite HTTP API integration | 39 passed |
| Executor HTTP contract with local Judge0 simulator | 11 passed |
| Mobile TypeScript and targeted ESLint | Passed |
| Expo web export | Passed; 603 modules |
| Website production build | Passed; existing large-bundle advisory remains |

Browser interaction checks verified downloaded-video persistence after reload, playback from a local blob, one queued offline progress update clearing after reconnect, resume of a saved answer and review flag without extending the deadline, real PDF and PNG file downloads, a 1200×800 PNG preview, Copy Link feedback, history restoration, and the clear-history confirmation. The downloaded sample PDF was rendered and visually checked as a single page.

The focused automated cases cover low-storage warnings, quota overflow, partial-file cleanup, interrupted downloads, account separation, FIFO eviction, failed sync retry, concurrent edits, version conflicts, corrupt drafts, offline cached assessments, successful-submit cleanup, and native share API calls/cancellation/errors. Browser hook integration also checks that course playback and the dashboard share the same queue notification and completion summary.

The five videos in `day4-demos` are **captioned walkthroughs composed from actual browser screenshots**, not continuous recordings or Android/iOS device footage. The offline scene uses the clearly labelled development simulation. Sample certificates are local fixtures and do not represent a real learner's awarded qualification.

## Checks still required before device sign-off

1. On a compatible Android/iOS build, download a real lesson, background/foreground the app during transfer, enable airplane mode, restart the app and play the saved file. Verify the OS does not terminate an unfinished download unexpectedly.
2. Verify draft resume/discard and the continuing deadline after force-closing the native app. Reconnect before submitting an offline assessment.
3. Open PDF and PNG share sheets on each target OS. Choose an installed mail/messaging/storage app and confirm the received attachment. Actual delivery depends on the selected app; it was not performed here.
4. Queue native playback progress, restart offline, reconnect and check the pending count and server progress. Make a conflicting update from another client and confirm server precedence.
5. Configure a live Judge0 endpoint and run `npm run test:judge0` in `backend` with `RUN_JUDGE0_LIVE=1`. The current local runner returned “temporarily unavailable”; successful live code output is not verified.

Source implementation and the automated/browser checks above are complete. Native device behavior, actual external sharing and live Judge0 execution should not be reported as already verified.

## Reproduce checks

Run each command from its indicated directory:

```text
backend:  npm run test:lms
backend:  npm run test:postgres    (LMS_TEST_DATABASE_URL = disposable local database)
frontend: npm run test:learning
frontend: npm run build
mobile:   npm test -- --runInBand
mobile:   npm run typecheck
mobile:   npx expo export --platform web --output-dir dist-learning --max-workers 2
```

The PostgreSQL verifier creates and removes only its random `lms_verify_*` schema, checks the two LMS upgrades against pre-upgrade fixtures, compares the final schema, then runs API tests. The SQLite integration suite resets only `backend/lms/test/integration.db`. Stop the isolated sample API before resetting that test fixture.
