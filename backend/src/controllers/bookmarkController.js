const Bookmark = require("../models/Bookmark");
const Discussion = require("../models/Discussion");
const { resolveUserId } = require("../middleware/authMiddleware");
const forumSocket = require("../websocket/forumSocket");

function list(req, res) {
    const userId = req.query.userId ? String(req.query.userId) : resolveUserId(req);
    res.status(200).json({ success: true, data: Bookmark.listByUser(userId), syncedAt: new Date().toISOString() });
}

function add(req, res) {
    const userId = resolveUserId(req);
    const discussionId = req.body.discussionId;
    if (!discussionId || !Discussion.findById(discussionId)) {
        return res.status(404).json({ success: false, message: "Discussion not found" });
    }
    const result = Bookmark.add(userId, discussionId);
    forumSocket.pushBookmarkChanged({ userId, discussionId, bookmarked: true });
    res.status(result.created ? 201 : 200).json({
        success: true,
        data: { userId, discussionId, bookmarked: true },
        created: result.created
    });
}

function remove(req, res) {
    const removed = Bookmark.remove(req.params.userId, req.params.discussionId);
    if (!removed) {
        return res.status(404).json({ success: false, message: "Bookmark not found" });
    }
    forumSocket.pushBookmarkChanged({ userId: req.params.userId, discussionId: req.params.discussionId, bookmarked: false });
    res.status(200).json({
        success: true,
        data: { userId: req.params.userId, discussionId: req.params.discussionId, bookmarked: false }
    });
}

module.exports = { list, add, remove };
