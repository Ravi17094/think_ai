# RBAC Guide Screenshot Capture Checklist

Use an approved Admin demo account and a safe test user. Do not capture passwords, access tokens, personal client records, or private notifications.

| Screenshot | What to capture | Redaction/check |
| --- | --- | --- |
| 01-rbac-matrix-overview.png | RBAC Permission Matrix heading, role columns, permission rows, Save changes button | Use generic test data only |
| 02-rbac-staged-change.png | One pre-approved permission checked/unchecked and the unsaved-change indicator | Do not show real client identities |
| 03-rbac-saved-change.png | Success confirmation after saving the approved test change | Confirm test role/permission only |
| 04-audit-log-review.png | Audit logs page with timestamp, action, target, and role-change columns | Redact names/emails if present |
| 05-audit-log-filter.png | Role filter and, if approved, CSV export control | Do not export/share real client data |

## Capture procedure

1. Log in as the approved Admin demo user.
2. Open **Admin > RBAC** and capture screenshot 01.
3. Change one approved test permission, capture screenshot 02, then save it.
4. Capture the success state as screenshot 03.
5. Open **Admin > Audit logs** and capture screenshots 04 and 05.
6. Review every image before attaching it to the client guide.
7. Add captions and arrows only after redaction review.

## Approval record

| Reviewer | Date | Approved for client guide | Notes |
| --- | --- | --- | --- |
| | | [ ] Yes [ ] No | |
