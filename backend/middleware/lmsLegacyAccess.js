// Strict authentication for the legacy Core LMS routers only. Existing teammate
// demo-auth helpers retain their current behavior on unrelated routes.
const db = require("../config/database");
const { auth } = require("../lms/auth");
const { check } = require("../lms/errors");
const verify = auth(db);

function authenticateToken(req, res, next) {
  verify(req, res, (error) => {
    if (error) return next(error);
    req.user = { ...req.lmsUser };
    next();
  });
}
function authorizeRoles(...roles) {
  const allowed = roles.flat().map((role) => String(role).toUpperCase());
  return (req, res, next) => {
    try {
      check(req.lmsUser, 401, "AUTH_REQUIRED", "Please sign in to continue.");
      const role = String(req.lmsUser.role).toUpperCase();
      check(
        allowed.includes(role) || (role === "SUPERADMIN" && allowed.includes("ADMIN")),
        403, "FORBIDDEN", "This operation requires an authorized role.",
      );
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { authenticateToken, authorizeRoles };
