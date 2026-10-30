const express = require("express");
const router = express.Router();
const { users } = require("../data/users");
const { roles } = require("../data/roles");
const { successResponse, errorResponse } = require("../utils/response");
const { validateUserIdParam, validateRoleBody } = require("../validations/roleValidation");

router.get("/users", (req, res) => {
  return successResponse(res, 200, "Users fetched", users);
});

router.get("/roles", (req, res) => {
  return successResponse(res, 200, "Roles fetched", roles);
});

router.post("/users/:id/assign-role", validateUserIdParam, validateRoleBody, (req, res) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) return errorResponse(res, 404, "User not found");
  user.role = role;
  return successResponse(res, 200, "Role assigned", user);
});

router.put("/users/:id/role", validateUserIdParam, validateRoleBody, (req, res) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) return errorResponse(res, 404, "User not found");
  user.role = role;
  return successResponse(res, 200, "Role updated", user);
});

module.exports = router;