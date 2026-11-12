const jwt = require("jsonwebtoken");

/** Strict authentication for external-provider credentials. Unlike local Forum
 * demo routes, this never falls back to a demo identity. */
module.exports = function requireStudioJwt(req, res, next) {
    const authorization = req.headers.authorization || "";
    if (!authorization.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "A valid login token is required" });
    }
    try {
        // The normal login controller prefers ACCESS_TOKEN_SECRET. Studio must
        // verify with the exact same secret or valid mobile logins are rejected.
        const decoded = jwt.verify(
            authorization.slice(7),
            process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "fallback_secret"
        );
        req.user = {
            id: String(decoded.id || decoded.userId || decoded.sub),
            name: decoded.name || decoded.email || "Participant",
            role: decoded.role || "Learner",
        };
        return next();
    } catch {
        return res.status(401).json({ success: false, message: "Login token is invalid or expired" });
    }
};
