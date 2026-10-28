# Thinkz AI Admin Guide: Roles and Permissions

## Who should use this guide

This guide is for authorised **Admin** users. Teaching Assistants, Instructors, and Learners should not be given permission-management access.

## Before you begin

1. Sign in with an approved Admin account.
2. Make changes only when you know the business reason and affected users.
3. Use a test account during training or demonstrations.
4. Keep an audit record of the change.

## Open the RBAC Permission Matrix

1. Open the Admin portal.
2. Select **RBAC** or browse to **Admin > RBAC Permission Matrix**.
3. Wait for the roles and permissions to load.
4. Check the role hierarchy message before editing. It explains how guarded access is inherited.

**Screenshot to add before sharing:** The RBAC Permission Matrix page showing the role columns, permission rows, and Save changes button.

## Read the matrix

- Each **row** is a permission, such as viewing a course or managing users.
- Each **column** is a role.
- A checked box means that role has a direct permission grant.
- An unchecked box means the permission is not directly granted.
- The application may also apply role hierarchy rules shown at the top of the page.

## Grant a permission

1. Find the permission row.
2. Find the role column.
3. Select the checkbox to grant the permission.
4. Confirm the page shows an unsaved change.
5. Select **Save changes**.
6. Wait for the success message.
7. Verify the change in the audit log.

**Screenshot to add before sharing:** A checked permission with the unsaved-change message visible.

## Remove a permission

1. Select the checked permission for the relevant role.
2. Review the impact before saving; removing a permission may prevent users from completing work.
3. Select **Save changes**.
4. Verify the result in the audit log.

## Cancel a change

If you selected a permission by mistake, select **Discard** before saving. This returns the matrix to its last saved state.

## Review the audit trail

Open **Admin > Audit logs** after saving an important change. The audit log helps Admins understand who made a change and when. Review the timestamp, actor role, action, target user, and role-change values. Use the role filter when investigating a specific type of activity. Export CSV only in line with the client data-handling policy.

**Screenshot to add before sharing:** Audit log showing a saved test role/permission change. Redact personal information before sharing.

## Troubleshooting

| Situation | What to do |
| --- | --- |
| "You do not have permission" | Sign out and use an approved Admin account. Do not attempt to bypass role checks. |
| Matrix does not load | Refresh once, check the connection, then contact the support team with the error and time. |
| Save button is disabled | Make a change first, or wait for an existing save to finish. |
| Change does not appear in the audit log | Refresh the log. If still missing, record the time, Admin account, and expected action for support. |
| Incorrect change was saved | Do not make multiple corrective changes. Record the details and ask the authorised Admin/support owner to restore the intended access. |

## Safe operating rules

- Never share Admin passwords or authentication tokens.
- Never grant Admin permissions solely for a demonstration.
- Use least privilege: grant only the permissions required for the role.
- Review the audit log after every important change.
- Keep this guide updated when the client asks a question that exposes a gap.
