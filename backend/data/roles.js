// This is our "list of allowed roles" for now.
// Later, when a real database is connected, this can move to a Roles table.
// Moderator added for the client community moderation deliverable (forum:* perms
// live on the role id "moderator" in config/forum.config.js).
const roles = ["Admin", "Instructor", "TA", "Moderator", "Learner"];

module.exports = { roles };
