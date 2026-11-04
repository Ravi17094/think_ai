# Mobile app (React Native) — module test report

Owner: Manjunath
Branch: `manjunath-new-feature`
Date: 2026-09-30

## Scope

Five learner-facing screens built as an Expo app in `mobile/`, sharing one
swappable `LearningApiClient` and a component/hook library:

| Screen | Route | Notes |
| --- | --- | --- |
| Learner Dashboard | `/learner/dashboard` | Enrolled-catalog join, progress bars, resume entry point. |
| My Courses | `/learner/courses` | Search, status filter tabs, course grid. |
| Course Detail | `/learner/courses/:id` | Enrollment CTA, module accordion, deep-linkable `moduleId`. |
| Global Search | `/search` | 300 ms debounce, recent searches, per-type result cache. |
| Forum Home | `/forum` | Category chips, tag filter, sort dropdown, infinite scroll, thread composer. |

Deep links resolve through `thinkzai://` and `https://app.thinkzai.com`.

## Verified

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | passed, 0 errors |
| Lint | `npm run lint` | passed, 0 errors, 0 warnings |
| Tests | `npm test` | **223 passed, 0 failed** across 21 suites |
| Expo health | `npx expo-doctor@latest` | **17/17 checks passed** |
| App config | `npx expo config --type public` | resolved clean |
| Release bundle | `npx expo export --platform android` | bundled 757 modules in 16.4 s, no resolution errors |
| Test hygiene | console scan of the Jest run | 0 `act()` warnings, 0 `console.error`, 0 React warnings |
| Browser E2E | `node scripts/serve-web-build.js 8099` + `node scripts/verify-app.mjs` | **28/28 checks passed** across all five screens |
| Demo walkthroughs | `node scripts/record-walkthroughs.mjs` | 5 WebM walkthroughs recorded, one per screen |
| Walkthrough integrity | `node scripts/verify-walkthroughs.mjs` | **5/5 decodable**, 53.9 s total, 8/8 distinct frames each |

### Test breakdown

| Suite | Tests |
| --- | --- |
| `tests/smoke.test.ts` | 1 |
| `tests/hooks/useDebouncedValue.test.ts` | 6 |
| `tests/utils/highlight.test.ts` | 11 |
| `tests/utils/responsive.test.ts` | 8 |
| `tests/dashboard/LearnerDashboardScreen.test.tsx` | 10 |
| `tests/dashboard/CourseCard.test.tsx` | 10 |
| `tests/dashboard/ProgressBar.test.tsx` | 8 |
| `tests/myCourses/MyCoursesScreen.test.tsx` | 11 |
| `tests/myCourses/useCourseSearch.test.tsx` | 9 |
| `tests/myCourses/CourseGrid.test.tsx` | 6 |
| `tests/myCourses/FilterTabs.test.tsx` | 5 |
| `tests/myCourses/SearchBar.test.tsx` | 7 |
| `tests/course/CourseDetailScreen.test.tsx` | 12 |
| `tests/course/ModuleAccordion.test.tsx` | 8 |
| `tests/course/EnrollButton.test.tsx` | 6 |
| `tests/search/GlobalSearchScreen.test.tsx` | 19 |
| `tests/search/useGlobalSearch.test.tsx` | 8 |
| `tests/search/useRecentSearches.test.tsx` | 10 |
| `tests/search/searchComponents.test.tsx` | 16 |
| `tests/forum/ForumHomeScreen.test.tsx` | 18 |
| `tests/forum/forumUnits.test.tsx` | 34 |

### Browser end-to-end run

`scripts/verify-app.mjs` drives the real Expo web export in Chromium at
390x844 against `http://localhost:8099`, using the deterministic mock client.
It covers scrolling, filtering, deep links, the accordion, enrollment, search
debounce/recents, and the forum composer. Results land in
`demo-artifacts/verification-report.json` with 14 screenshots.

| Signal | Result |
| --- | --- |
| Checks | 28 passed, 0 failed |
| Console errors / page errors | 0 / 0 |
| Console warnings | 0 (5 expected web-only `useNativeDriver` warnings are whitelisted) |
| Frame timing | avg 16.76 ms, p95 16.9 ms, 0 frames over 50 ms, 59.7 effective FPS |

The `useNativeDriver` warnings are inherent to running an animation that is
correct on device inside a web export; `LoadingState` was left as-is rather
than degraded to silence them.

### Demo walkthroughs

`scripts/record-walkthroughs.mjs` drives the same export through each screen's
own story and records it as WebM — one video per screen, in
`demo-artifacts/walkthroughs/`. The dashboard scrolls its list, My Courses types
a query and switches all three filter tabs, Course Detail expands modules,
Global Search debounces a query then commits and replays a recent, and Forum
Home paginates, sorts, filters and posts a new thread through the composer.

| Screen | Route | Duration | Size | Console errors |
| --- | --- | --- | --- | --- |
| Learner Dashboard | `/learner/dashboard` | 5.4 s | 292 KB | 0 |
| My Courses | `/learner/courses` | 8.9 s | 404 KB | 0 |
| Course Detail | `/learner/courses/course-1?moduleId=mod-0-1` | 6.7 s | 303 KB | 0 |
| Global Search | `/search` | 10.8 s | 261 KB | 0 |
| Forum Home | `/forum` | 22.2 s | 1032 KB | 0 |

`scripts/verify-walkthroughs.mjs` then decodes each file in Chromium and checks
the EBML header, decoded duration, resolution and frame variety — a file can
have bytes on disk and still be an unplayable or frozen clip, so file size is
not treated as proof. All five report a valid 390x844 stream with 8 of 8
sampled frames distinct.

## Fixed

Product defects found while writing the tests:

1. **Pull-to-refresh and post-a-thread never refetched.** `useForumThreads`
   signalled a reload with `setPage(1)`, which React treats as a no-op when the
   list is already on page 1 — so neither `refresh()` nor `createThread()`
   issued a request. Both now bump a `reloadNonce` that participates in the
   fetch effect's dependencies (`src/hooks/useForumThreads.ts`).
2. **Rapid scroll events over-advanced pagination.** `loadMore()` relied on an
   in-flight flag that the fetch effect only set after React re-rendered, so
   several scroll events landing in one tick each queued their own page
   increment (page jumped 1 → 4). `loadMore()` now claims the slot
   synchronously before calling `setPage`.
3. **The forum composer stayed disabled forever.** `CreatePostModal` only
   adopted a category through its own fetch, so with categories already loaded
   by the screen the modal sat on `categoryId === ''` and could never submit.
   It now adopts the first available category as soon as one arrives.
4. **Catalog and enrollment courses collided.** The fixture factory emitted the
   same ids for both sets, producing duplicate React keys on the dashboard.
   `createCourseFactory(seed, idPrefix)` now namespaces them (`course-N` vs
   `catalog-N`).
5. **Every global-search query matched.** Mock result subtitles echoed the query
   back, so the relevance check always succeeded. Subtitles are now
   query-independent and matching runs against titles plus `SEARCH_KEYWORDS`.

Environment fixes:

6. `typescript` pinned to `~5.3.3` and the invalid `newArchEnabled` key removed
   from `app.json` — `expo-doctor` was failing both checks.
7. ESLint was declared in `package.json` but not installed or configured, so
   `npm run lint` could never run. Added `eslint@^8.57.0` with
   `eslint-config-expo@~7.1.2` and a `.eslintrc.js` declaring the Node and Jest
   environments for tooling and test files.

## Definition of Done

- [x] All five screens implemented with loading, error, empty, refresh,
      pagination and deep-link states.
- [x] Constants pinned to spec: `SEARCH_DEBOUNCE_MS = 300`,
      `FORUM_PAGE_SIZE = 15`, `INFINITE_SCROLL_THRESHOLD = 0.8`.
- [x] Tests written and passing (223/223).
- [x] Zero `act()` warnings, `console.error` output and React warnings in tests.
- [x] `tsc --noEmit`, ESLint, `expo-doctor` and `expo config` all clean.
- [x] Metro release bundle builds for a device target.
- [x] Browser end-to-end pass over all five screens in the web export.
- [x] **Demo recordings** for the five screen walkthroughs — 5 WebM clips,
      integrity-checked as decodable and non-static.
- [ ] **On-device verification.** Frame-drop profiling and touch/scroll checks
      on a real Android or iOS target. The Chromium run above gives a frame
      baseline only; it does not replace a device pass.

The on-device pass is still outstanding and cannot be closed on this machine.
Re-checked 2026-10-01: `adb`, `java`, `javac`, `gradle`, `emulator`,
`watchman` and `xcodebuild` are all absent, and `ANDROID_HOME`,
`ANDROID_SDK_ROOT` and `JAVA_HOME` are unset, so no device, emulator or
simulator can be launched from here. Run on a machine with the toolchain
installed:

```
npx expo start                 # then press a / i
# Android: adb shell dumpsys gfxinfo com.thinkzai.mobile   (frame stats)
```

## Blocked on other teams

- **OpenAPI contract** — no schema was available, so the client is defined by
  local TypeScript interfaces and the deterministic mock in
  `src/api/mockClient.ts`. Swapping in a generated client is a single
  `LearningApiClient` implementation.
- **Auth / JWT** — no auth service contract; the app runs unauthenticated
  against the mock.
- **WebSocket schema** — no realtime spec, so Forum Home refreshes over HTTP
  rather than subscribing to thread events.
- **Design tokens** — no official token set; `src/theme/tokens.ts` holds local
  values pending the design system.
---

# Pages 6–10 — Forum thread, create post, bookmarks, moderation, checkout

Owner: Manjunath
Branch: `manjunath-new-feature`
Date: 2026-10-07

## Scope

Five community and commerce screens added to the same Expo app, sharing the
swappable `LearningApiClient`:

| Screen | Route | Notes |
| --- | --- | --- |
| Forum Thread Detail | `/forum/thread/:threadId` | Parsed markdown body, depth-3 replies, optimistic thread/reply votes, solved toggle, debounced @mention autocomplete, reply composer with preview. |
| Create Post | `/create-post` | Title/tag/category validation, category dropdown, tag multi-select (max 5), markdown toolbar, preview modal, confirm-before-publish. |
| Bookmarks | `/bookmarks` | Saved threads with sync chip, optimistic remove with rollback, re-sync on session change. |
| Moderation Dashboard | `/moderation` | Flag queue with derived severity, preview modal, hide/show, dismiss, soft-delete behind a confirm dialog, member search/warn/ban/unban, audit log. |
| Checkout | `/checkout` | Plan cards, custom validated card form (Luhn/expiry/CVV), discount code validation, cost centre, 18% GST summary, pay through a confirm dialog with inline decline attempts. |

## API integration

Every Pages 6–10 method is declared on `LearningApiClient`
(`src/api/client.ts`) and implemented once in `src/api/communityClient.ts`
(`createCommunityClient()`), which is spread into `src/api/mockClient.ts` for
deterministic tests. Requests go through the shared `src/api/http.ts` envelope
path (`x-user-id` header, `?userId=` fallback, optional Bearer).

| Screen | Methods |
| --- | --- |
| Thread Detail | `fetchThreadDetail`, `fetchThreadReplies`, `submitReply`, `voteThread`, `setThreadSolved`, `searchMentionUsers` |
| Create Post | `fetchDiscussionCategories`, `fetchAllTags`, `createDiscussion` |
| Bookmarks | `fetchBookmarks`, `removeBookmark` |
| Moderation | `fetchFlaggedQueue`, `fetchFlagReports`, `fetchModerationPolicy`, `fetchModerationUsers`, `fetchAuditLog`, `fetchUserPosts`, `setManagedContentVisibility`, `dismissFlag`, `deleteManagedContent`, `warnModerationUser`, `banModerationUser`, `unbanModerationUser` |
| Checkout | `fetchPlans`, `validateDiscountCode`, `createPaymentIntent`, `confirmPayment` |

Backend gaps are handled client-side, no mock data anywhere:

- **No comment-vote endpoint** — `ThreadReply` carries no score/userVote; reply
  votes are device-local via `useReplyVotes` (AsyncStorage
  `thinkz.community.replyVotes`), the only local state in Pages 6–10.
- **No hard-delete endpoint** — `deleteManagedContent` composes hide + resolve
  (`deleted: true`) against `setManagedContentVisibility`/`dismissFlag`.
- **No severity field** — `deriveSeverity` computes it from report counts
  against the `fetchModerationPolicy` thresholds.
- **Categories have no slug** — `slugify(name)` in `src/api/communityClient.ts`.
- **Payment intent endpoint not deployed yet** — 404/405/501 degrade to a
  deferred `pi_deferred_*` intent so `confirm` can process the order (the
  intent seam is one method, swappable when Janadeep ships the API).
- **Discount 400** — body `{valid:false,status}` is normalized to
  `DiscountValidation`; **confirm 402** — the structured decline in
  `payload.data` (attempts, attemptsUsed, failureCode) renders inline on the
  page instead of throwing.

## Skeleton loaders

| Screen | Skeleton |
| --- | --- |
| Thread Detail | Header + body + reply-stack placeholders, shown until thread and replies resolve. |
| Create Post | Form skeleton while categories/tags load. |
| Bookmarks | List skeleton while `fetchBookmarks` is in flight. |
| Moderation | `flag-queue-table-skeleton` (queue tab), member and audit skeletons on their tabs. |
| Checkout | `checkout-skeleton` — plan cards, summary and card-form placeholders. |

All five switch to a retryable `ErrorState` on failure, and every destructive
or irreversible action (reply publish, delete, warn/ban, payment) runs through
a shared `ConfirmDialog`.

## Verified

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | passed, 0 errors |
| Lint | `npm run lint` | passed, 0 errors, 0 warnings |
| Tests | `npm test` | **327 passed, 0 failed** across 28 suites (223 Pages 1–5 + 104 Pages 6–10) |

### Test breakdown (Pages 6–10)

| Suite | Tests |
| --- | --- |
| `tests/community/communityUnits.test.tsx` | 23 |
| `tests/api/communityClient.test.ts` | 22 |
| `tests/forum/ForumThreadDetailScreen.test.tsx` | 12 |
| `tests/forum/CreatePostScreen.test.tsx` | 9 |
| `tests/forum/BookmarksScreen.test.tsx` | 8 |
| `tests/forum/ModerationScreen.test.tsx` | 14 |
| `tests/checkout/CheckoutScreen.test.tsx` | 16 |
| **Total** | **104** |

Covered per screen: skeleton → data → error/retry transitions, the validation
paths (Luhn/expiry/CVV, cost centre, title/tags/categories), optimistic
actions with rollback on API failure, confirm-dialog cancel and success
paths, API argument contracts (`communityClient.test.ts`), and the pure units
(markdown parsing, mention insertion, severity derivation, pricing maths).

## Definition of Done (Pages 6–10)

- [x] All five screens implemented with skeleton loaders, error states with
      retry, empty states and confirm dialogs for destructive actions.
- [x] `LearningApiClient` extended with every Page 6–10 method; live
      implementation in `src/api/communityClient.ts` + mock spread in
      `src/api/mockClient.ts`.
- [x] No hard-coded mock data beyond the shared Page 1–5 fixtures; the only
      local state is device-local reply votes (no backend endpoint).
- [x] Routes registered in `src/navigation/types.ts` + `linking.ts` and
      `src/App.tsx`.
- [x] `npm run typecheck`, `npm run lint`, `npm test` all clean
      (327/327 tests).
- [ ] Browser/E2E + demo recordings for Pages 6–10 (the Pages 1–5 artifacts
      above predate these screens).
- [ ] Runtime verification against the backend — blocked locally, see below.

## Blocked on other teams (Pages 6–10)

- **Payment intent API** — Janadeep's `POST /api/v1/payments/intents` is not
  deployed; the client degrades to a deferred intent so `confirm` still
  works. Swap `createPaymentIntent` when the endpoint lands.
- **Discount validation + confirm** — contracts are source-verified only; the
  backend cannot start on this machine (Prisma exits without a live
  Postgres), so `validate-discount` and `confirm` have not been exercised
  over HTTP.
- **Notifications API** — no endpoint for community notification fan-out yet,
  so Pages 6–7 create posts/replies without pushing notifications.

---

# Learner experience refresh (Udemy-inspired IA)

Owner: Manjunath
Branch: `manjunath-mobile-features`
Date: 2026-11-02

## Scope

A learner-first refresh of the existing mobile surfaces. The Thinkz AI brand,
auth gate, routes, deep links and `LearningApiClient` seam are unchanged; the
work adds an inspiration/continuation hierarchy and the missing learning flows
on top of the existing data layer. No Udemy assets, trademarks or SDKs are used.

| Surface | What changed |
| --- | --- |
| Learner Dashboard | Discovery header, enrollment stat, category shortcuts, featured rail, continue-learning shelf, recommended rail, shared loading/error/empty states. |
| My Learning | New `/learner/my-learning` route with stats, search, status/category filters, resume cards, refresh and an actionable empty state. |
| My Courses | Category + sort chips and category-aware deep links, all filtered client-side so the existing `searchCourses` contract stays unchanged. |
| Course Detail | Learning objectives, persisted progress, enrollment/re-enroll states, resume CTA, lesson-aware curriculum and search shortcut. |
| Video Player | Full curriculum, previous/next navigation, mark-complete mutations with progress recalculation, certificate and assessment entry points. |
| Global Search | Popular-search suggestions and category shortcuts on the idle state; the existing 300 ms debounce, recents and per-type cache are preserved. |
| Shared components | `SectionHeader`, `CategoryChips`, `SortChips`, `CourseRail`, richer `CourseCard`/`CourseGrid`, and lesson-aware `ModuleAccordion`. |

## Functionality

- `LearningApiClient` gained `enrollCourse` and `updateLessonProgress`; the
  deterministic mock implements both and keeps timestamps fixed (`MOCK_NOW`).
- `useEnrollments` now exposes enrollment lookup plus both mutations, updating
  the shared list optimistically only after the API resolves.
- Course categories are derived from course tags in `src/utils/course.ts`, so
  no backend schema change is required.
- The catalogue category/sort controls filter locally; `searchCourses` is still
  called with only `{ query, status }`.
- Existing test IDs and the 400 ms enroll transition are preserved.

## Accessibility and responsive checks

- Every new interactive control has a role and accessible label; decorative
  glyphs are hidden from screen readers.
- Category/sort chips, section actions, player controls and curriculum rows
  expose 44 px minimum targets (or an equivalent 64 px play control).
- `CourseGrid` was asserted at **375 px** and **390 px**: two columns with
  181.5 px / 189 px card widths, consistent gutters and expanded `hitSlop`.
- `CourseRail` keeps a 248 px card so the next card peeks in at both widths.
- `ModuleAccordion` announces completion, and the player announces play/pause,
  previous/next, selected lesson and busy states.

## Verified

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | passed, 0 errors |
| Lint | `npm run lint` | passed, 0 errors, 0 warnings |
| Tests | `npx jest --silent` | **498 passed, 0 failed** across 49 suites |
| Accessibility/responsive suites | `npx jest src/tests/a11y --silent` | 42 passed, 0 failed |
| Android release bundle | `npx expo export --platform android` | bundled 866 modules (2.3 MB Hermes bundle), no resolution errors |

### Changed/new test coverage

| Suite | Tests |
| --- | --- |
| `tests/dashboard/LearnerDashboardScreen.test.tsx` | 17 |
| `tests/myLearning/MyLearningScreen.test.tsx` | 12 |
| `tests/myCourses/MyCoursesScreen.test.tsx` | 16 |
| `tests/course/CourseDetailScreen.test.tsx` | 19 |
| `tests/course/ModuleAccordion.test.tsx` | 9 |
| `tests/learning/VideoPlayerScreen.test.tsx` | 11 |
| `tests/search/GlobalSearchScreen.test.tsx` | 21 |
| `tests/a11y/learnerA11y.test.tsx` | 6 |
| `tests/a11y/learnerResponsive.test.tsx` | 6 |

### Completion status

| Area | Status |
| --- | --- |
| UI implementation | Complete for the assigned learner screens and shared components. |
| Functionality | Complete against the existing `LearningApiClient` and deterministic mock; no backend contract changes beyond the two additive methods. |
| Automated testing | Complete: unit, screen, accessibility and responsive assertions pass. |
| On-device visual verification | Not run: no Android SDK/emulator or iOS simulator is available on this machine. The 375/390 px checks above are component-level layout assertions, not a device screenshot pass. |

Known follow-up: when the Android toolchain is available, repeat the 375 px and
390 px pass on an emulator/device and capture screenshots for the screenshot
artifact set. This does not block the module handover.

## Appearance controls and app-wide theme pass — 2026-11-02

- Dashboard now has a compact, right-aligned Appearance segmented control with Light and Dark options.
- Profile exposes an expandable Appearance row; selecting it reveals the same Light/Dark choices and selected state. Theme selection persists through the existing `ThemeProvider` preference.
- Updated screen and shared component styles to use the active palette, including learner, course, search, forum, moderation, checkout, auth, learning and onboarding surfaces. The status bar switches foreground style with the selected theme.

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | Passed, 0 errors |
| Lint | `npm run lint` | Passed, 0 warnings |
| Jest | `npm test -- --runInBand --silent` | **506 passed, 0 failed** across 54 suites |
| Appearance screen coverage | Profile + dashboard suites | Passed; Profile expands the setting and Home switches both modes |
| Android export | `npx expo export --platform android` | Passed; bundled 877 modules, emitted a 2.37 MB Hermes bundle to `dist/` |
