const express = require("express");
const router = express.Router();
const { roles } = require("../data/roles");
const requireRole = require("../middleware/requireRole");

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
// KNOWN ISSUE: task doc expects 5 roles, only 4 exist in data/roles.js and data/users.js — flagged for follow-up
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
  });
});

module.exports = router;