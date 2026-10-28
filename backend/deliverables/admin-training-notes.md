# Thinkz AI Client Admin Training - Facilitator Notes

## Status

Prepared for delivery. Do not mark the session as completed until it has been conducted with approved client Admin users.

## Session details

| Item | Value |
| --- | --- |
| Audience | Client users with an Admin account |
| Duration | 45 minutes |
| Facilitator | Raviteja |
| Prerequisites | Staging/production URL, approved Admin credentials, one safe test user, screen-recording approval |
| Recording | Obtain client consent before starting |

## Agenda

1. **Welcome and access model - 5 min**
   - Explain that only Admin users manage users, roles, and permissions.
   - Explain that every important role or permission change should be reviewed in the audit log.

2. **User management - 10 min**
   - Open the Admin user-management area.
   - Demonstrate locating a test user and reviewing the current role.
   - Create or use only the approved safe test account; do not change a real client account during training.

3. **Roles and RBAC permissions - 15 min**
   - Open **Admin > RBAC Permission Matrix**.
   - Explain the role columns, permission rows, direct grants, and role inheritance.
   - Change one pre-approved test permission, point out the unsaved-change status, then select **Save changes**.
   - If the client does not approve a change, use **Discard** instead.

4. **Audit log review - 10 min**
   - Open the audit-log view.
   - Review timestamp, actor role, action, target user, and role-change information.
   - Filter by role if appropriate and export CSV only if the client requests it.

5. **Client hands-on and questions - 5 min**
   - Let a client Admin repeat one safe role/permission task.
   - Record questions, feedback, and follow-up actions below.

## Presenter checklist

- [ ] Confirm Admin user can sign in.
- [ ] Confirm the RBAC matrix loads.
- [ ] Confirm a safe test user exists.
- [ ] Confirm audit logs load before the session.
- [ ] Confirm recording consent and the approved storage location.
- [ ] Keep the RBAC guide open as a reference.

## Training outcomes

| Outcome | Complete | Notes |
| --- | --- | --- |
| Client Admin can locate user management | [ ] | |
| Client Admin can explain role assignment | [ ] | |
| Client Admin can make and save a safe RBAC change | [ ] | |
| Client Admin can review an audit entry | [ ] | |
| Questions and action items captured | [ ] | |

## Questions and action items

| Question or feedback | Owner | Priority | Due date | Status |
| --- | --- | --- | --- | --- |
| | | | | |

## Recording handover

After the session, save the approved recording as `admin-training-session.mp4` in the client-approved location. Do not upload a recording containing credentials, personal data, or unapproved client information.
