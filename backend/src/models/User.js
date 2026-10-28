const db = require("../data/mockData");

const AVATAR_COLORS = db.avatarColors;

const auditLog = [];

function logAuditAction(action) {
    auditLog.push({
        id: db.makeId("audit"),
        ...action,
        timestamp: new Date().toISOString()
    });
}

function getAuditLog() {
    return [...auditLog];
}

function serialize(user) {
    if (!user) return null;
    let hash = 0;
    for (let i = 0; i < user.id.length; i += 1) hash = (hash * 31 + user.id.charCodeAt(i)) >>> 0;
    return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        banned: Boolean(user.banned),
        warned: Boolean(user.warned),
        muted: Boolean(user.muted),
        avatarColor: AVATAR_COLORS[hash % AVATAR_COLORS.length]
    };
}

function list() {
    return db.users.map(serialize);
}

function findById(id) {
    const user = db.users.find((u) => u.id === id);
    return user ? serialize(user) : null;
}

function findByUsername(username) {
    const needle = String(username).toLowerCase();
    const user = db.users.find((u) => u.username.toLowerCase() === needle);
    return user ? serialize(user) : null;
}

function setBanned(id, banned) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    user.banned = Boolean(banned);
    logAuditAction({ type: banned ? "ban_user" : "unban_user", targetUserId: id, detail: user.name });
    return serialize(user);
}

function setWarned(id, warned) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    user.warned = Boolean(warned);
    logAuditAction({ type: warned ? "warn_user" : "unwarn_user", targetUserId: id, detail: user.name });
    return serialize(user);
}

function setMuted(id, muted) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    user.muted = Boolean(muted);
    logAuditAction({ type: muted ? "mute_user" : "unmute_user", targetUserId: id, detail: user.name });
    return serialize(user);
}

module.exports = { serialize, list, findById, findByUsername, setBanned, setWarned, setMuted, getAuditLog, logAuditAction };
