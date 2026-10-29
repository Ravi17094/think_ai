class LmsError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function check(condition, status, code, message) {
  if (!condition) throw new LmsError(status, code, message);
}
module.exports = { LmsError, check };
