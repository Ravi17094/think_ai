# Forum Category Guide (Handover)

Owner: Forum Developer · Audience: Client community managers and course authors

## Source of truth

Categories are derived from the *categories actually used in the client content files*
(`backend/data/client-forum-seed-prod.json` and `backend/data/client-announcements-prod.json`),
so a category can never exist without threads and a thread can never reference a missing
category. The canonical set is built in `backend/src/services/forum/forumDataService.js`
(`buildCategories`).

## The five categories

| id | Name | Color | Description | Seed usage |
| --- | --- | --- | --- | --- |
| `c-announcements` | Announcements | amber | Official client platform updates | Community Guidelines, Onboarding Resources, Monthly AMA Schedule, Welcome thread, Progress dashboard, Conference rooms (pinned threads land here) |
| `c-qa` | Q&A | emerald | Ask questions and get answers | Release notes structure question |
| `c-help` | Help & Support | red | Client platform help and troubleshooting | Data reporting migration errors |
| `c-projects` | Projects | cyan | Show what your team is building | Microlearning pilot, Vendor security checklist |
| `c-general` | General | violet | Community-wide discussions | Mentor reading list |

## Pinned announcements

Three threads are force-pinned (ids returned by `forumDataService.pinnedThreadIds()`):

- `d-ann-guidelines` — Community Guidelines
- `d-ann-onboarding` — Onboarding Resources (updated after every release)
- `d-ann-ama` — Monthly AMA Schedule

## Tag taxonomy

29 tags from `backend/data/client-tag-taxonomy-prod.json`, surfaced at `GET /api/tags`.
They mirror the client knowledge base and drive the tag filter + search. Use these exact
names when authoring (they are lowercased on import): community, welcome, onboarding,
guidelines, moderation, ama, events, schedule, resources, getting-started, release-notes,
product, collaboration, progress, courses, faq, reporting, data, migration, microlearning,
pilot, learning, mentors, reading-list, security, procurement, checklist, conference, booking.

## Authoring rules

1. Search before posting — check for an existing thread.
2. Tag posts so members can filter.
3. Announcements where intended for everyone; Q&A for questions; Projects for showcases;
   Help & Support for platform issues; General otherwise.
4. Mark a thread solved when your question is answered.
5. Content is loaded from the client JSON files; interface authors should **not** add
   generated/mock threads — `verifyZeroMockContent` fails loudly on generated ids or
   template sentences.

## Content health

Each seeded thread carries real `views`, `upvotes`, `downvotes` and `solved` state from the
client files. Comments (e.g. the release-notes template reply) ship with the seed too.
See `docs/handover/community-health-metrics.md` for how to read these signals.