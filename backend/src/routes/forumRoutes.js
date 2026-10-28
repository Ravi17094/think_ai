/**
 * React Native forum contract aliases.
 *
 * Mounted at `/api/forum`, this exposes the path set the mobile client is
 * specified against without changing the existing `/api/discussions`,
 * `/api/comments` or `/api/moderation` routes:
 *
 *   GET   /api/forum/threads/:id
 *   GET   /api/forum/threads/:id/replies
 *   POST  /api/forum/threads/:id/replies
 *   PATCH /api/forum/threads/:id/solved       (author only)
 *   GET   /api/forum/flags
 *   PATCH /api/forum/posts/:id/action         (hide/show/delete/resolve)
 */

const express = require("express");

const router = express.Router();

const discussionController = require("../controllers/discussionController");
const commentController = require("../controllers/commentController");
const moderationController = require("../controllers/moderationController");
const Discussion = require("../models/Discussion");
const Comment = require("../models/Comment");
const User = require("../models/User");

router.get("/threads/:id", discussionController.getOne);

router.get("/threads/:id/replies", (req, res) => {
    req.params.discussionId = req.params.id;
    commentController.listByDiscussion(req, res);
});

router.post("/threads/:id/replies", (req, res) => {
    req.params.discussionId = req.params.id;
    req.body = { ...(req.body || {}), discussionId: req.params.id };
    commentController.create(req, res);
});

router.patch("/threads/:id/solved", (req, res) => {
    const discussion = Discussion.findById(req.params.id);
    if (!discussion) {
        return res.status(404).json({ success: false, message: "Discussion not found" });
    }
    if (discussion.authorId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: "Only the thread author can change the solved state",
        });
    }
    return discussionController.setSolved(req, res);
});

router.get("/flags", moderationController.flaggedQueue);

router.patch("/posts/:id/action", (req, res) => {
    const { type, action } = req.body || {};
    const id = req.params.id;
    if (!["discussion", "comment"].includes(type)) {
        return res.status(400).json({
            success: false,
            message: "type must be 'discussion' or 'comment'",
        });
    }
    if (!["hide", "show", "delete", "resolve"].includes(action)) {
        return res.status(400).json({
            success: false,
            message: "action must be one of: hide, show, delete, resolve",
        });
    }

    const model = type === "discussion" ? Discussion : Comment;
    const content = model.findById(id);
    if (!content) {
        return res.status(404).json({ success: false, message: `${type} not found` });
    }

    if (action === "resolve") {
        model.setFlagged(id, false);
        model.setHidden(id, false);
        User.logAuditAction({ type: "resolve_flag", targetContentId: id, contentType: type });
        return res.status(200).json({
            success: true,
            data: { id, type, resolved: true, hidden: false },
        });
    }

    if (action === "delete") {
        model.setHidden(id, true);
        model.setFlagged(id, false);
        User.logAuditAction({ type: "delete_content", targetContentId: id, contentType: type });
        return res.status(200).json({
            success: true,
            data: { id, type, hidden: true, resolved: true, deleted: true },
        });
    }

    const hidden = action === "hide";
    const updated = model.setHidden(id, hidden);
    User.logAuditAction({
        type: hidden ? "hide_content" : "show_content",
        targetContentId: id,
        contentType: type,
    });
    return res.status(200).json({
        success: true,
        data: { id, type, hidden: Boolean(updated.hidden) },
    });
});

module.exports = router;
