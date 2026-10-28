# Community Moderation Playbook (Handover)

Owner: Forum Developer · Reviewed: Client Community Managers

## Policy at a glance

| Setting | Value | Where |
| --- | --- | --- |
| Auto-flag threshold | 3 reports | `backend/config/forum.config.js` → `moderationThresholds.autoFlagReports` |
| Auto-hide threshold | 5 reports | `moderationThresholds.hideReports` |
| Auto-hide window | 5 reports within 1 hour of the first report | `moderationThresholds.hideWindowMs` |
| Auto-hide permanence | Hidden posts CAN be unshelved by a moderator | `moderationThresholds.autoHideIsPermanent: false` |
| Moderator role id | `moderator` | `config/forum.config.js` → `moderatorRole` |
| Moderator permissions | `forum:read`, `forum:hide-post`, `forum:warn-user`, `forum:view-reports` | same |
| Content filter | 47 blocked terms | `backend/config/client-blocked-terms.json` |

All thresholds and permissions are data-driven and live in `backend/config/forum.config.js`;
change the file and restart — no code change needed.

## Who can moderate

Provisioned from real client data in `backend/data/client-moderators-prod.csv`:

- Olivia Bennett · olivia.bennett@clientdomain.com
- Marcus Chen · marcus.chen@clientdomain.com
- Sofia Almeida · sofia.almeida@clientdomain.com
- Aisha Rahman · aisha.rahman@clientdomain.com

Platform admins (`u1` Meera, `u2` Arjun, `u3`/`u4` ops accounts) are also recognized as
moderators by `moderatorService.isModerator`. `GET /api/moderation/roles` returns the full
list; `grantModeratorRole` in `backend/src/services/forum/moderatorService.js` assigns the
`moderator` role.The `Moderator` platform role is in `backend/data/roles.js` with its matrix
grants in `backend/routes/roleMatrix.js`.

## The flag → review pipeline

1. Any signed-in member flags a post or comment (with an optional reason).
   - `POST /api/discussions/:id/flag` (see `discussionController.flag`)
   - `POST /api/comments/:id/flag` (see `commentController.flag`)
2. `moderationPolicy.applyReport` records the report (deduplicated per reporter), then:
   - at 3 distinct reporters → content is auto-`flagged` for review;
   - at 5 distinct reporters within the 60-minute window → content is auto-`hidden`.
3. Hidden content is excluded from list/search/list responses (`contentStatus`/`hidden` flag).
4. Moderators review via the report ledger and can manually restore hidden content
   (policies allow unshelving; no content is permanently destroyed).

A moderator action (hide/unhide/warn) creates a **moderator-action** event which is routed
**email-only** — an intent is written to `db.pendingEmails` via `notificationService.notifyModeratorAction`; no in-app notification is sent (`backend/config/notification-defaults.js`).

## Publish-time filter

New discussions/comments any member creates are checked against the client blocked-terms
filter (`backend/src/services/forum/contentFilter.js`, terms file
`backend/config/client-blocked-terms.json`). A blocked post is rejected with
`422 CONTENT_REVIEW_REQUIRED` (and the *word/term* is sanitized to keep counts private).
Flag content you believe violates the guidelines with the reason provided — moderators
review every report.

## Moderator endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/moderation/policy` | Machine-readable copy of the current policy (thresholds, role, contact) |
| `GET /api/moderation/roles` | Moderator roster + role definition |
| `GET /api/moderation/reports` | Report ledger (who reported, what, status) |
| `GET /api/moderation/notifications` | Moderator notification queue |

## Escalation

- Support / policy questions: learning-support@clientdomain.com.
- Content that risks legal exposure is drafted in `deliverables/community-guidelines-draft.md`
  with status `submitted` to Client Legal Team (legal@clientdomain.com).

## Tests

`backend/communityModeration.test.js` covers thresholds (3 flag / 5 hide — using fresh
threads d2/d3/d4 per test to stay isolated), dedupe-per-reporter, publisher blocked-term
rejections, and the notification routing. Run with `npm test` in `backend/`.