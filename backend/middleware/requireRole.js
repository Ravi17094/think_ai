// TEMPORARY: role passed via header or bearer token until real login/auth system exists
function requireRole(allowedRoles) {
  return (req, res, next) => {
    let userRole = req.headers["x-user-role"];

    if (!userRole && req.headers.authorization?.startsWith("Bearer ")) {
      userRole = req.headers.authorization.split(" ")[1];
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
    }
    req.user = { role: userRole };
    next();
  };
}

module.exports = requireRole;