const jwt = require('jsonwebtoken');
const { roleSatisfies } = require("../config/roleHierarchy"); // Ensure this file exists, or handle role matching directly
const { logAccessDenied } = require("../services/auditLogService");

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const requiredRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const authHeader = req.headers.authorization;
    const demoRole = req.headers["x-demo-role"];
    const demoUserId = req.headers["x-demo-user-id"];

    let userRole = null;

    // Reuse the verified identity when more than one guard runs in this request.
    if (req.thinkzAuthenticatedUser) {
      req.user = req.thinkzAuthenticatedUser;
      userRole = req.user.role;
    }
    // 1. Check for standard Bearer JWT Token
    else if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded; // Attach decoded user info (id, email, role)
        req.thinkzAuthenticatedUser = decoded;
        userRole = req.user.role;
      } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
      }
    } 
    // 2. Fallback to Dev/Demo Mode Headers (matching socket middleware pattern)
    else if (demoRole) {
      req.user = {
        id: demoUserId || "demo-user-1",
        role: demoRole
      };
      req.thinkzAuthenticatedUser = req.user;
      userRole = demoRole;
    } 
    // 3. No authentication method found
    else {
      return res.status(401).json({
        success: false,
        message: "Authentication required: No token or demo role provided"
      });
    }

    // Check role permissions using roleHierarchy config or simple array check
    const hasPermission = typeof roleSatisfies === 'function' 
      ? roleSatisfies(userRole, requiredRoles)
      : requiredRoles.includes(userRole);

    if (!hasPermission) {
      logAccessDenied({ actorRole: userRole, targetUserId: req.user?.id, route: req.originalUrl, requiredRoles });
      return res.status(403).json({
        success: false,
        code: "INSUFFICIENT_ROLE",
        message: "You do not have permission to access this resource.",
        requiredRoles,
      });
    }

    next();
  };
}

module.exports = requireRole;
