const Comment = require("../models/Comment");
const Discussion = require("../models/Discussion");
const notificationService = require("../services/notificationService");
const discussionService = require("../services/discussionService");
const forumSocket = require("../websocket/forumSocket");
const moderationPolicy = require("../services/forum/moderationPolicy");
const contentFilter = require("../services/forum/contentFilter");

function list(req, res) {
    const result = discussionService.listDiscussions(req.query, req.user ? req.user.id : null);
    res.status(200).json({ success: true, data: result });
}

function getOne(req, res) {
    const discussion = Discussion.findById(req.params.id);
    if (!discussion || discussion.hidden) {
        return res.status(404).json({ success: false, message: "Discussion not found" });
    }
    Discussion.incrementViews(discussion.id);
    res.status(200).json({ success: true, data: Discussion.serialize(discussion, req.user.id) });
}

function create(req, res) {
    const { valid, errors, trimmedTitle, trimmedBody } =
        discussionService.validateDiscussionInput(req.body);

    if (!valid) {
        return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    if (contentFilter.hasBlockedContent(`${trimmedTitle}\n${trimmedBody}`)) {
        return res.status(422).json({
            success: false,
            message: "Content review required: your discussion was flagged by the community content policy.",
            code: "CONTENT_REVIEW_REQUIRED",
            blockedTerms: contentFilter.findBlockedTerms(`${trimmedTitle}\n${trimmedBody}`)
        });
    }

    const discussion = Discussion.create({
        title: trimmedTitle,
        body: trimmedBody,
        tags: req.body.tags,
        categoryId: req.body.categoryId,
        authorId: req.user.id
    });

    const createdNotifications = notificationService.notifyMentions({
        text: trimmedBody,
        authorId: req.user.id,
        message: `${req.user.username} mentioned you in “${trimmedTitle}”`,
        link: `/forum/${discussion.id}`
    });

    forumSocket.pushDiscussionNew(Discussion.serialize(discussion, req.user.id));

    res.status(201).json({
        success: true,
        data: Discussion.serialize(discussion, req.user.id),
        notificationsCreated: createdNotifications.length
    });
}

function vote(req, res) {
    const direction = req.body.direction;
    if (!["up", "down", "none"].includes(direction)) {
        return res.status(400).json({
            success: false,
            message: "direction must be one of: up, down, none"
        });
    }

    const result = Discussion.vote(req.params.id, req.user.id, direction);
    if (!result) {
        return res.status(404).json({ success: false, message: "Discussion not found" });
    }

    res.status(200).json({
        success: true,
        data: {
            id: result.discussion.id,
            upvotes: result.discussion.upvotes,
            downvotes: result.discussion.downvotes,
            score: result.discussion.upvotes - result.discussion.downvotes,
            userVote: result.userVote
        }
    });
}

function setSolved(req, res) {
    const discussion = Discussion.setSolved(req.params.id, Boolean(req.body.solved));
    if (!discussion) {
        return res.status(404).json({ success: false, message: "Discussion not found" });
    }
    if (req.body.solved && discussion.authorId !== req.user.id) {
        notificationService.notifySolved({
            discussionAuthorId: discussion.authorId,
            solverName: req.user.name || req.user.username,
            discussionId: discussion.id,
            discussionTitle: discussion.title
        });
    }
    res.status(200).json({ success: true, data: Discussion.serialize(discussion, req.user.id) });
}

function flag(req, res) {
    const discussion = Discussion.findById(req.params.id);
    if (!discussion) {
        return res.status(404).json({ success: false, message: "Discussion not found" });
    }

    // Content filter (client blocked terms) + report-count policy.
    if (contentFilter.hasBlockedContent(`${discussion.title}\n${discussion.body}`)) {
        Discussion.setHidden(discussion.id, true);
        return res.status(200).json({
            success: true,
            data: { id: discussion.id, action: "auto-hidden", flagged: true, hidden: true, reportCount: 0 }
        });
    }

    const outcome = moderationPolicy.applyReport({
        contentType: "discussion",
        contentId: discussion.id,
        reporterUserId: req.user ? req.user.id : null,
        reason: req.body.reason
    });

    if (!outcome.ok) {
        return res.status(404).json({ success: false, message: "Discussion not found" });
    }

    if (outcome.action === "auto-hidden") {
        announceModeration({ action: "auto-hide", contentType: "discussion", contentId: discussion.id });
    } else if (outcome.action === "flagged") {
        announceModeration({ action: "auto-flag", contentType: "discussion", contentId: discussion.id });
    }

    res.status(201).json({
        success: true,
        data: {
            id: discussion.id,
            flagged: outcome.flagged,
            hidden: outcome.hidden,
            action: outcome.action,
            reportCount: outcome.reportCount,
            autoFlagReports: outcome.autoFlagReports,
            hideReports: outcome.hideReports
        }
    });
}

function announceModeration(payload) {
    forumSocket.pushModerationUpdate(payload);
}

module.exports = { list, getOne, create, vote, setSolved, flag };
