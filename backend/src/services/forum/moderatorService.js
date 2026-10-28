/**
 * Moderator role + assignment service.
 *
 * The "moderator" role is defined in config/forum.config.js (id + permissions).
 * This service:
 *   - resolves which users hold the moderator role (assignment junction: userRoles)
 *   - exposes role/permissions helpers for authorization checks and info endpoints
 *   - ensures the four client community managers from the seed CSV are assigned
 */

const { moderatorRole, communityConfig } = require("../../../config/forum.config");
const db = require("../../data/mockData");

/** Role ids that imply full moderator power in addition to the moderator role id. */
const ALL_MODERATOR_ROLE_IDS = ["moderator", "administrator", "moderator:superuser"];

/** Ids of users granted the moderator role (from the userRoles junction). */
function moderatorUserIds() {
    return Object.keys(db.userRoles).filter((userId) =>
        (db.userRoles[userId] || []).some((roleId) => ALL_MODERATOR_ROLE_IDS.includes(roleId))
    );
}

/** True when `user` object (with a `.id`) holds the moderator role. */
function isModerator(user) {
    if (!user || !user.id) return false;
    return moderatorUserIds().includes(user.id);
}

/**
 * Permissions a user effectively holds. Admin inherits everything; moderator
 * role grants the client-mandated forum permissions.
 */
function permissionsFor(user) {
    if (!user || !user.id) return [];
    const assigned = db.userRoles[user.id] || [];
    if (assigned.includes("administrator")) {
        return [...moderatorRole.permissions, "*"];
    }
    if (assigned.some((roleId) => ALL_MODERATOR_ROLE_IDS.includes(roleId))) {
        return [...moderatorRole.permissions];
    }
    return [];
}

/** Public overview of the moderator group (used by /moderation/roles). */
function listModerators() {
    return db.users
        .filter((u) => moderatorUserIds().includes(u.id))
        .map((u) => ({ id: u.id, name: u.name, username: u.username, email: u.email, role: u.role }));
}

/** Read-only role definition used by the /moderation/roles info endpoint. */
function roleDefinition() {
    return {
        id: moderatorRole.id,
        name: moderatorRole.name,
        description: moderatorRole.description,
        permissions: [...moderatorRole.permissions],
        supportEmail: communityConfig.supportEmail
    };
}

/** Registers a userId into the moderator role junction (idempotent). */
function grantModeratorRole(userId) {
    if (!db.users.some((u) => u.id === userId)) return null;
    const current = db.userRoles[userId] || [];
    if (!current.includes(moderatorRole.id)) {
        db.userRoles[userId] = [...current, moderatorRole.id];
    }
    return db.userRoles[userId];
}

const moderatorService = {
    moderatorRole,
    moderatorUserIds,
    isModerator,
    permissionsFor,
    listModerators,
    roleDefinition,
    grantModeratorRole
};

module.exports = moderatorService;