const Notification = require("../models/Notification");
const { resolveUserId } = require("../middleware/authMiddleware");

function list(req, res) {
    const userId = req.query.userId ? String(req.query.userId) : resolveUserId(req);
    const unreadOnly = req.query.unreadOnly === "true";
    res.status(200).json({ success: true, data: Notification.listByUser(userId, { unreadOnly }) });
}

function markRead(req, res) {
    const notification = Notification.markRead(req.params.id);
    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true, data: Notification.serialize(notification) });
}

function markAllRead(req, res) {
    const userId = req.body.userId ? String(req.body.userId) : resolveUserId(req);
    const marked = Notification.markAllRead(userId);
    res.status(200).json({ success: true, data: { userId, marked: marked.length } });
}

function getPrefs(req, res) {
    res.status(200).json({ success: true, data: Notification.getPrefs(req.params.userId || resolveUserId(req)) });
}

function savePrefs(req, res) {
    const saved = Notification.savePrefs(req.params.userId || resolveUserId(req), req.body || {});
    res.status(200).json({ success: true, data: saved });
}

module.exports = { list, markRead, markAllRead, getPrefs, savePrefs };
