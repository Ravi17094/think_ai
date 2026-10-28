/**
 * Mobile notification-preference projection.
 *
 * The forum notification module stores a flat channel policy
 * (`{ email, inApp, sms }`). The React Native settings screen edits an
 * event-group × channel matrix (`replies`, `mentions`, `sessions`, `payments`),
 * so this service owns that shape and persists it per user for the process
 * lifetime. Unknown groups/channels are ignored on write, keeping the payload
 * forward-compatible.
 */

const GROUPS = ["replies", "mentions", "sessions", "payments"];
const CHANNELS = ["email", "inApp", "sms"];

const EVENT_BY_GROUP = {
    replies: "new-reply",
    mentions: "mention",
};

const DEFAULT_PREFS = Object.freeze({
    replies: { email: true, inApp: true, sms: false },
    mentions: { email: true, inApp: true, sms: false },
    sessions: { email: false, inApp: true, sms: false },
    payments: { email: true, inApp: true, sms: false },
});

const preferencesByUser = new Map();

function clone(prefs) {
    return GROUPS.reduce((acc, group) => {
        acc[group] = { ...prefs[group] };
        return acc;
    }, {});
}

function getPreferences(userId) {
    const key = String(userId);
    if (!preferencesByUser.has(key)) {
        preferencesByUser.set(key, clone(DEFAULT_PREFS));
    }
    return clone(preferencesByUser.get(key));
}

function mirrorToNotificationEvents(userId, body) {
    const Notification = require("../models/Notification");

    Object.entries(EVENT_BY_GROUP).forEach(([group, event]) => {
        const incoming = body[group];
        if (!incoming || typeof incoming !== "object") {
            return;
        }
        const channels = {};
        let hasOverride = false;
        CHANNELS.forEach((channel) => {
            if (typeof incoming[channel] === "boolean") {
                channels[channel] = incoming[channel];
                hasOverride = true;
            }
        });
        if (hasOverride) {
            Notification.saveEventPrefs(String(userId), event, channels);
        }
    });
}

function savePreferences(userId, patch) {
    const current = getPreferences(userId);
    const body = patch && typeof patch === "object" ? patch : {};

    GROUPS.forEach((group) => {
        const incoming = body[group];
        if (!incoming || typeof incoming !== "object") {
            return;
        }
        CHANNELS.forEach((channel) => {
            if (typeof incoming[channel] === "boolean") {
                current[group][channel] = incoming[channel];
            }
        });
    });

    preferencesByUser.set(String(userId), clone(current));
    mirrorToNotificationEvents(userId, body);
    return getPreferences(userId);
}

function resetForTests() {
    preferencesByUser.clear();
}

module.exports = {
    GROUPS,
    CHANNELS,
    DEFAULT_PREFS,
    getPreferences,
    savePreferences,
    resetForTests,
};
