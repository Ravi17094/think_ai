const crypto = require("node:crypto");

// Each integration has a separate credential. User bearer tokens, general JWT
// secrets, query parameters and body fields never authorize service callbacks.
const SERVICES = Object.freeze({
  judge0: { env: "JUDGE0_CALLBACK_SECRET", header: "x-judge0-callback-secret" },
  recording: { env: "RECORDING_CALLBACK_SECRET", header: "x-recording-callback-secret" },
});
function internalCallbackAuth(service, env = process.env) {
  const config = SERVICES[service];
  if (!config) throw new Error("Unknown internal callback service.");
  return (req, res, next) => {
    const expected = env[config.env];
    if (typeof expected !== "string" || expected.trim().length < 32)
      return res.status(503).json({ success: false, code: "CALLBACK_NOT_CONFIGURED", message: "Service callback authentication is not configured." });
    const supplied = req.headers[config.header];
    if (typeof supplied !== "string" || !supplied || supplied.length > 4096)
      return res.status(401).json({ success: false, code: "CALLBACK_AUTH_REQUIRED", message: "Service callback authentication is required." });
    // Hash before comparing so credential lengths cannot cause timingSafeEqual
    // to throw, and comparison always covers fixed-size buffers.
    const digest = (value) => crypto.createHash("sha256").update(value, "utf8").digest();
    if (!crypto.timingSafeEqual(digest(supplied), digest(expected)))
      return res.status(401).json({ success: false, code: "CALLBACK_AUTH_INVALID", message: "Service callback authentication failed." });
    req.callbackService = service;
    next();
  };
}
module.exports = { internalCallbackAuth };
