// Simple tracking cache map to satisfy requirement without breaking schemas immediately
const loginAttemptsCache = new Map();
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 Minutes lockout

const checkLockout = (req, res, next) => {
  const { email } = req.body;
  if (!email) return next();

  const record = loginAttemptsCache.get(email);

  if (record && record.attempts >= 5) {
    const timePassed = Date.now() - record.lockoutStartedAt;
    
    if (timePassed < LOCKOUT_TIME) {
      const minutesLeft = Math.ceil((LOCKOUT_TIME - timePassed) / 60000);
      return res.status(423).json({
        success: false,
        error: `Security Lockout Active. Try again in ${minutesLeft} minutes.`
      });
    } else {
      // Clear the lockout window timer threshold if limit expires
      loginAttemptsCache.delete(email);
    }
  }
  next();
};

module.exports = { checkLockout, loginAttemptsCache };