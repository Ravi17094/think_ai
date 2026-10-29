const jwt = require("jsonwebtoken");
const { check } = require("./errors");
function auth(db, env = process.env) {
  return async (req, res, next) => {
    try {
      const secret = env.ACCESS_TOKEN_SECRET || env.JWT_SECRET;
      check(
        secret,
        503,
        "AUTH_NOT_CONFIGURED",
        "Configure the same token secret used by login.",
      );
      const token = /^Bearer (.+)$/i.exec(req.headers.authorization || "")?.[1];
      check(token, 401, "AUTH_REQUIRED", "Please sign in to continue.");
      let claims;
      try {
        claims = jwt.verify(token, secret, { algorithms: ["HS256"] });
      } catch {
        return res
          .status(401)
          .json({
            success: false,
            code: "TOKEN_EXPIRED",
            message: "Please sign in again.",
          });
      }
      const id = Number(claims.id ?? claims.userId ?? claims.sub);
      check(
        Number.isSafeInteger(id) && id > 0,
        401,
        "INVALID_IDENTITY",
        "Token must contain a numeric user ID.",
      );
      const user = await db.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true },
      });
      check(user, 401, "USER_NOT_FOUND", "Account is unavailable.");
      // Role/email are read from the database, never trusted from headers or stale token claims.
      req.lmsUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
function staff(req, res, next) {
  try {
    check(
      ["admin", "instructor", "superadmin"].includes(
        String(req.lmsUser.role).toLowerCase(),
      ),
      403,
      "FORBIDDEN",
      "Staff access required.",
    );
    next();
  } catch (error) {
    next(error);
  }
}
module.exports = { auth, staff };
