# Community Health Metrics (Handover)

Owner: Forum Developer · Purpose: how to read signal from the live forum data.

## Signals available per thread

Every discussion exposes the real values from the client seed (`backend/data/client-forum-seed-prod.json`):

- `views` — read count (Welcome 4021, Guidelines 5120, Onboarding Resources 3987, AMA 2210).
- `upvotes` / `downvotes` — engagement + controversy (Guidelines +240/−3 vs Announcement +6/−0).
- `solved` — self-service resolution (set on the Welcome, Progress dashboard, Microlearning pilot
  and all three pinned announcements; unanswered help threads stay `solved: false`).
- `pinned` — official / evergreen announcements.
- `tags` — taxonomy tags for segmenting the same signals by tag (e.g. `ama`, `reporting`).

Comments carry author + createdAt, so reply velocity can be bucketed per thread.

## Moderation health

- `flagged` / `hidden` / `reportCount` on a post — pipeline state (`contentStatus` computed by
  `backend/src/services/forum/moderationPolicy.js`). A spike in distinct reporters on one
  thread inside the 60-minute window is the early-warning sign: watch the 3-report
  auto-flag and the 5-report auto-hide transitions.
- `GET /api/moderation/reports` — the report ledger (reporter, target, status).
- `GET /api/moderation/policy` — runtime view of the thresholds so dashboards never drift
  from the config in `backend/config/forum.config.js`.

## Notification routing health

`GET /api/moderation/notifications` read from `db.notifications`; per-event channel defaults
in `backend/config/notification-defaults.js`:

| Event | Channel |
| --- | --- |
| new-reply | in-app only |
| mention | email + in-app |
| moderator-action | email only (intent in `db.pendingEmails`, no in-app) |

## Performance budget

Search over the real seeded content must complete well under 300 ms — verified in
`backend/realForumSeeding.test.js` (asserts both `responseTimeMs` in the payload and
wall-clock). Data is in-memory and mocked-free, so this holds until a real database is wired.

## Deliverables references

- Onboarding collection: `u8` carries 4 bookmarks in the `new-user-onboarding` collection plus
  the 3 personal seed bookmarks, so dashboards can demo "new user gets a curated list".
- Guidelines/legal state lives in `deliverables/community-guidelines-draft.md` (status
  `submitted`, owner Client Legal Team).