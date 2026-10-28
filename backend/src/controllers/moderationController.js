const Comment = require("../models/Comment");
const Discussion = require("../models/Discussion");
const User = require("../models/User");
const Notification = require("../models/Notification");
const forumSocket = require("../websocket/forumSocket");
const notificationService = require("../services/notificationService");
const moderationPolicy = require("../services/forum/moderationPolicy");
const moderatorService = require("../services/forum/moderatorService");

/**
 * Moderator action notifications follow the client-mandated precondition:
 * moderator actions are routed to email only (config/notification-defaults.js).
 */
function notifyUser(userId, message) {
    if (!userId) return;
    notificationService.notifyModeratorAction({ userId, message, link: "/forum" });
}

function announceModeration(payload) {
    forumSocket.pushModerationUpdate(payload);
}

function buildQueueItem(kind, item) {
    const author = User.findById(item.authorId);
    return {
        id: item.id,
        type: kind,
        title: kind === "discussion" ? item.title : `Comment on discussion ${item.discussionId}`,
        excerpt:
            kind === "discussion"
                ? String(item.body).slice(0, 160)
                : String(item.body).slice(0, 160),
        reason: item.flagReason,
        flaggedAt: item.updatedAt || item.createdAt,
        reporterName: item.flagReporterName || "Anonymous user",
        hidden: Boolean(item.hidden),
        authorName: author ? author.name : "Unknown user",
        authorId: item.authorId
    };
}

function flaggedQueue(_req, res) {
    const discussionItems = Discussion.listAll()
        .filter((d) => d.flagged)
        .map((d) => buildQueueItem("discussion", d));
    const commentItems = Comment.listAll()
        .filter((c) => c.flagged)
        .map((c) => buildQueueItem("comment", c));
    res.status(200).json({ success: true, data: [...discussionItems, ...commentItems] });
}

function listUsers(_req, res) {
    res.status(200).json({ success: true, data: User.list() });
}

function banUser(req, res) {
    const user = User.setBanned(req.params.id, true);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    notifyUser(req.params.id, "Your account has been banned by a moderator.");
    announceModeration({ action: "ban", userId: user.id, banned: true });
    res.status(200).json({ success: true, data: user });
}

function unbanUser(req, res) {
    const user = User.setBanned(req.params.id, false);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    notifyUser(req.params.id, "Your account has been unbanned.");
    announceModeration({ action: "unban", userId: user.id, banned: false });
    res.status(200).json({ success: true, data: user });
}

function warnUser(req, res) {
    const user = User.setWarned(req.params.id, true);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    User.logAuditAction({ type: "warn_user_policy", targetUserId: user.id, detail: "Community policy warning" });
    notifyUser(req.params.id, "You have received a warning from a moderator.");
    announceModeration({ action: "warn", userId: user.id, warned: true });
    res.status(200).json({ success: true, data: user });
}

function muteUser(req, res) {
    const { muted } = req.body || {};
    const user = User.setMuted(req.params.id, muted !== false);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    notifyUser(req.params.id, muted !== false ? "You have been muted." : "You have been unmuted.");
    announceModeration({ action: muted !== false ? "mute" : "unmute", userId: user.id, muted: muted !== false });
    res.status(200).json({ success: true, data: user });
}

function getAuditLog(_req, res) {
    res.status(200).json({ success: true, data: User.getAuditLog() });
}

function setContentVisibility(req, res) {
    const { type, hidden } = req.body || {};
    const id = req.params.id;
    if (!["discussion", "comment"].includes(type)) {
        return res.status(400).json({ success: false, message: "type must be 'discussion' or 'comment'" });
    }
    const updated =
        type === "discussion" ? Discussion.setHidden(id, Boolean(hidden)) : Comment.setHidden(id, Boolean(hidden));
    if (!updated) {
        return res.status(404).json({ success: false, message: `${type} not found` });
    }
    User.logAuditAction({ type: hidden ? "hide_content" : "show_content", targetContentId: id, contentType: type });
    announceModeration({
        action: hidden ? "hide" : "show",
        contentType: type,
        contentId: id,
        hidden: Boolean(updated.hidden),
        targetUserId: updated.authorId
    });
    res.status(200).json({
        success: true,
        data: { id, type, hidden: Boolean(updated.hidden) }
    });
}

function resolveContent(req, res) {
    const { type } = req.body || {};
    const id = req.params.id;
    const updated =
        type === "discussion" ? Discussion.setFlagged(id, false) : Comment.setFlagged(id, false);
    if (!updated) {
        return res.status(404).json({ success: false, message: `${type} not found` });
    }
    if (type === "discussion") Discussion.setHidden(id, false);
    else Comment.setHidden(id, false);
    User.logAuditAction({ type: "resolve_flag", targetContentId: id, contentType: type });
    announceModeration({
        action: "dismiss",
        contentType: type,
        contentId: id,
        resolved: true,
        targetUserId: updated.authorId
    });
    res.status(200).json({ success: true, data: { id, type, resolved: true } });
}

function hiddenContent(_req, res) {
    const items = [
        ...Discussion.listAll()
            .filter((d) => d.hidden)
            .map((d) => buildQueueItem("discussion", d)),
        ...Comment.listAll()
            .filter((c) => c.hidden)
            .map((c) => buildQueueItem("comment", c))
    ];
    res.status(200).json({ success: true, data: items });
}

/**
 * GET /moderation/policy — client moderation policy (thresholds, moderator
 * role) consumed by the moderation dashboard and the handover playbook.
 */
function policy(_req, res) {
    res.status(200).json({
        success: true,
        data: {
            ...moderationPolicy.policySummary(),
            moderatorRole: moderatorService.roleDefinition()
        }
    });
}

/** GET /moderation/roles — moderator role definition + assigned moderators. */
function roles(_req, res) {
    res.status(200).json({
        success: true,
        data: {
            role: moderatorService.roleDefinition(),
            moderators: moderatorService.listModerators(),
            supportEmail: moderatorService.roleDefinition().supportEmail
        }
    });
}

/** GET /moderation/reports — raw report ledger for the review queue. */
function reportLedger(_req, res) {
    res.status(200).json({ success: true, data: dbReportsLedger() });
}

function dbReportsLedger() {
    const db = require("../data/mockData");
    return db.reports.map((report) => {
        const content =
            report.contentType === "discussion"
                ? Discussion.findById(report.contentId)
                : Comment.findById(report.contentId);
        return {
            id: report.id,
            contentType: report.contentType,
            contentId: report.contentId,
            reason: report.reason,
            createdAt: report.createdAt,
            reporterName: report.reporterUserId ? (User.findById(report.reporterUserId) || {}).name : "Anonymous user",
            authorId: content ? content.authorId : null,
            excerpt: content ? String(content.body || "").slice(0, 120) : ""
        };
    });
}

module.exports = { flaggedQueue, hiddenContent, listUsers, banUser, unbanUser, warnUser, muteUser, setContentVisibility, resolveContent, getAuditLog, policy, roles, reportLedger };