# Android verification

14 October 2026. Own `com.thinkzai.mobile` debug APK, Android 14 API 34 x86_64 emulator, live local backend/PostgreSQL and real remote Judge0 execution. UI actions used adb and UI Automator. This is an actual installed Android application.

- Workspace: `02-workspace.png`.
- Player: `03-course-player.png`, `03-video-paused.png`, `03-video-completion.png`, `03-playback-resumed.png`, `03-notes-saved.png`, `03-offline-warning.png`, `03-offline-note.png`.
- Timed assessment: `04-assessment-timer.png`, `04-flagged-draft.png`, `04-draft-restored.png`, `04-submit-confirmation.png`. Draft and flag survived force-stopping/relaunching the app. The absolute deadline continued counting down.
- Results: `05-mcq-results.png`, `06-coding-results.png`. Both scored 10/10; coding used actual Judge0, with the verdict stored in the database.
- Certificate: `07-certificate.png`, `07-pdf-preview.png`, `07-share-result.png`, `07-pdf-save-button.png`, `07-file-picker-ready.png`, `07-save-finished.png`. PDF was saved through Android Print → Save as PDF → Downloads. `native-certificate.pdf` is the app's original download; `native-saved-certificate.pdf` is the saved copy retrieved from Downloads. Name, course, date and PDF format were verified.
- Analytics: `08-native-calendar.png`, `08-analytics-table.png`, `08-course-performance.png`. The table scrolls horizontally to expose and sort the score column.
- Playground: `09-native-editor.png`, `09-playground-output.png`. Monaco loaded and real Python execution returned `Hello, Thinkz AI!`.
- Profile: `10-profile-updated.png` shows the saved edit; the demo name was restored afterward.

`03-course-player.mp4` and `04-assessment-taking.mp4` record portions of these actual native actions. The complete eight-flow browser recording and individual browser demos are in `../patan-all-days/`. Screenshots/XML capture the additional native verification steps after each recording ended.

`verification.json` records database/file postconditions checked by `node scripts/verify-patan-native-state.cjs` from the project root. The retained video position was 5.054 seconds after reopening. Testing found and fixed initial video status updates overwriting saved position, and a Monaco loading placeholder that remained visible. Two video regression tests were added; the complete mobile suite passes 367 tests.

During the deliberate network-disconnect test, the debug build also showed a development-only Metro warning; it was dismissed after reconnection. Android UI Automator occasionally timed out while waiting for idle; affected actions were retried and verified. iOS/physical-phone behavior is not claimed. Cloud storage and email remain unconfigured: the certificate screen correctly reports local storage and email not sent. No real S3/email claim is made.
