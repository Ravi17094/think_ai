const express = require("express");
const router = express.Router();
const { roles } = require("../data/roles");
const requireRole = require("../middleware/requireRole");
const { ROLE_HIERARCHY } = require("../config/roleHierarchy");
const { logPermissionChange } = require("../services/auditLogService");

/**
 * GET /api/roles/matrix
 * Returns the full RBAC permission matrix: all roles, all permissions,
 * and which permissions each role is granted.
 * Consumed by frontend/src/components/RBACMatrix.jsx
 */

const permissions = [
  "view_courses",
  "edit_courses",
  "delete_courses",
  "view_users",
  "edit_users",
  "assign_roles",
  "view_assessments",
  "grade_assessments",
  "view_audit_log",
  "export_audit_log",
  "manage_notifications",
];

// Grants: which permissions each role has
// Moderator role added (client moderation deliverable) — 5 roles now present.
const grants = {
  Admin: [
    "view_courses", "edit_courses", "delete_courses",
    "view_users", "edit_users", "assign_roles",
    "view_assessments", "grade_assessments",
    "view_audit_log", "export_audit_log",
    "manage_notifications",
  ],
  Instructor: [
    "view_courses", "edit_courses",
    "view_users",
    "view_assessments", "grade_assessments",
    "manage_notifications",
  ],
  // Client community moderator (added for the moderation deliverable; forum
  // permission set "forum:read | forum:hide-post | forum:warn-user | forum:view-reports"
  // is defined on the role id "moderator" in config/forum.config.js).
  Moderator: [
    "view_courses",
    "view_users",
    "view_audit_log",
    "manage_notifications",
  ],
  TA: [
    "view_courses",
    "view_users",
    "view_assessments", "grade_assessments",
  ],
  Learner: [
    "view_courses",
    "view_assessments",
    "manage_notifications",
  ],
};

router.get("/matrix", requireRole(["Admin"]), (req, res) => {
  res.status(200).json({
    success: true,
    roles,
    permissions,
    grants,
    inheritance: ROLE_HIERARCHY,
  });
});
/**
 * PATCH /api/roles/:role/permissions/:permission
 * Grants or revokes a permission for a role.
 * Body: { granted: true|false }
 */
router.patch("/:role/permissions/:permission", requireRole(["Admin"]), (req, res) => {
  const { role, permission } = req.params;
  const { granted } = req.body;

  if (!grants[role]) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }

  const current = new Set(grants[role]);
  granted ? current.add(permission) : current.delete(permission);
  grants[role] = Array.from(current);

  const auditEntry = logPermissionChange({
    actorRole: req.user.role,
    role,
    permission,
    granted: Boolean(granted),
  });

  res.status(200).json({ success: true, role, permission, granted, auditEntry });
});
module.exports = router;
