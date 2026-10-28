const db = require("../data/mockData");
const notificationDefaults = require("../../config/notification-defaults");

function serialize(notification) {
    return { ...notification };
}

function listByUser(userId, { unreadOnly } = {}) {
    return db.notifications
        .filter((n) => n.userId === userId)
        .filter((n) => (unreadOnly ? !n.read : true))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(serialize);
}

function create({ userId, type, message, link }) {
    const notification = {
        id: db.makeId("n"),
        userId,
        type: type || "system",
        message,
        link: link || "/forum",
        read: false,
        createdAt: new Date().toISOString()
    };
    db.notifications.unshift(notification);
    return notification;
}

function markRead(id) {
    const notification = db.notifications.find((n) => n.id === id);
    if (!notification) return null;
    notification.read = true;
    return notification;
}

function markAllRead(userId) {
    const notifications = db.notifications.filter((n) => n.userId === userId);
    notifications.forEach((n) => {
        n.read = true;
    });
    return notifications.map(serialize);
}

function getPrefs(userId) {
    if (!db.notificationPrefs[userId]) {
        db.notificationPrefs[userId] = { email: true, inApp: true, sms: false };
    }
    return { ...db.notificationPrefs[userId] };
}

function savePrefs(userId, prefs) {
    const current = getPrefs(userId);
    const next = {
        email: typeof prefs.email === "boolean" ? prefs.email : current.email,
        inApp: typeof prefs.inApp === "boolean" ? prefs.inApp : current.inApp,
        sms: typeof prefs.sms === "boolean" ? prefs.sms : current.sms
    };
    db.notificationPrefs[userId] = next;
    return { ...next };
}

/**
 * Event-scoped channel preferences (client-mandated defaults from
 * config/notification-defaults.js): new-reply / mention / moderator-action.
 * Returns the client default merged with any per-user override.
 */
function getEventPrefs(userId, event) {
    if (!db.notificationEventPrefs[userId]) {
        db.notificationEventPrefs[userId] = {};
    }
    const defaults = notificationDefaults.getNotificationDefaults(event);
    if (!defaults) return null;
    const override = db.notificationEventPrefs[userId][event] || {};
    return {
        email: typeof override.email === "boolean" ? override.email : defaults.email,
        inApp: typeof override.inApp === "boolean" ? override.inApp : defaults.inApp,
        sms: typeof override.sms === "boolean" ? override.sms : defaults.sms
    };
}

/** Persists a per-event override (used by future advanced preference UIs). */
function saveEventPrefs(userId, event, prefs) {
    if (!db.notificationEventPrefs[userId]) {
        db.notificationEventPrefs[userId] = {};
    }
    const current = getEventPrefs(userId, event);
    if (!current) return null;
    db.notificationEventPrefs[userId][event] = {
        email: typeof prefs.email === "boolean" ? prefs.email : current.email,
        inApp: typeof prefs.inApp === "boolean" ? prefs.inApp : current.inApp,
        sms: typeof prefs.sms === "boolean" ? prefs.sms : current.sms
    };
    return { ...db.notificationEventPrefs[userId][event] };
}

module.exports = { serialize, listByUser, create, markRead, markAllRead, getPrefs, savePrefs, getEventPrefs, saveEventPrefs };
