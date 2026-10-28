const Notification = require("../models/Notification");
const forumSocket = require("../websocket/forumSocket");
const db = require("../data/mockData");

/** Creates a notification and pushes it to the recipient's live socket room. */
function createAndBroadcast({ userId, type, message, link }) {
    if (!userId) return null;
    const notification = Notification.create({ userId, type, message, link });
    forumSocket.pushNotification(notification);
    return notification;
}

/**
 * Create notifications for every @mention found in `text`.
 * Respects each recipient's event-scoped "mention" preference (default:
 * email + in-app); returns the created list so callers (REST or websocket)
 * can push toasts to connected clients.
 */
function notifyMentions({ text, authorId, message, link }) {
    const pending = require("./mentionService").notifyMentions(text, authorId, { message, link });
    return pending
        .filter((item) => {
            const prefs = Notification.getEventPrefs(item.userId, "mention");
            return prefs ? prefs.inApp !== false : true;
        })
        .map((item) =>
            createAndBroadcast({
                userId: item.userId,
                type: item.type,
                message: item.message,
                link: item.link
            })
        );
}

/**
 * Notify the discussion author when someone replies to their thread.
 * Channel routing uses the client-mandated "new-reply" default (in-app only).
 */
function notifyReply({ discussionAuthorId, replierName, discussionId, discussionTitle }) {
    if (!discussionAuthorId) return null;
    const prefs = Notification.getEventPrefs(discussionAuthorId, "new-reply");
    if (!prefs || prefs.inApp === false) return null;
    return createAndBroadcast({
        userId: discussionAuthorId,
        type: "reply",
        message: `${replierName} replied to "${discussionTitle}"`,
        link: `/forum/${discussionId}`
    });
}

/**
 * Notify the discussion author when their question is marked as solved.
 * (No client default is defined for this event; uses the general preference.)
 */
function notifySolved({ discussionAuthorId, solverName, discussionId, discussionTitle }) {
    if (!discussionAuthorId) return null;
    const prefs = Notification.getPrefs(discussionAuthorId);
    if (prefs.inApp === false) return null;
    return createAndBroadcast({
        userId: discussionAuthorId,
        type: "solved",
        message: `Your question "${discussionTitle}" was marked as solved by ${solverName}`,
        link: `/forum/${discussionId}`
    });
}

/**
 * Notify a user that a moderator acted on their account/content.
 *
 * Channel routing uses the client-mandated "moderator-action" default
 * (email only). The forum module records the email intent in the data layer
 * so the platform email dispatcher can deliver it; no in-app notification is
 * created for this event.
 */
function notifyModeratorAction({ userId, message, link }) {
    if (!userId) return null;
    const prefs = Notification.getEventPrefs(userId, "moderator-action");
    const channels = {
        email: prefs ? prefs.email : true,
        inApp: prefs ? prefs.inApp : false,
        sms: prefs ? prefs.sms : false
    };
    const emailIntent = {
        id: db.makeId("em"),
        userId,
        type: "moderator-action",
        message,
        link: link || "/forum",
        createdAt: new Date().toISOString(),
        channels
    };
    db.pendingEmails.push(emailIntent);
    return emailIntent;
}

function listForUser(userId) {
    return Notification.listByUser(userId);
}

module.exports = { notifyMentions, notifyReply, notifySolved, notifyModeratorAction, listForUser };