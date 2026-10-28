const db = require("../data/mockData");

// Forum Performance: a new reply changes reply counts + hot-thread ranking,
// so the 5-minute cached views for that discussion must be invalidated.
const { forumPerformanceService } = require("../services/forum/perf/forumPerformanceService");
const { invalidateForDiscussionSync } = forumPerformanceService;

function serialize(comment) {
    const author = db.users.find((u) => u.id === comment.authorId);
    return {
        id: comment.id,
        discussionId: comment.discussionId,
        parentId: comment.parentId || null,
        body: comment.body,
        authorId: comment.authorId,
        createdAt: comment.createdAt,
        hidden: Boolean(comment.hidden),
        author: {
            id: comment.authorId,
            name: author ? author.name : "Unknown user",
            username: author ? author.username : "unknown"
        }
    };
}

function findByDiscussion(discussionId, includeHidden) {
    const items = db.comments
        .filter((c) => c.discussionId === discussionId)
        .filter((c) => (includeHidden ? true : !c.hidden))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return items.map(serialize);
}

function create({ discussionId, parentId, body, authorId }) {
    const comment = {
        id: db.makeId("cm"),
        discussionId,
        parentId: parentId || null,
        body,
        authorId,
        createdAt: new Date().toISOString(),
        flagged: false,
        hidden: false
    };
    db.comments.push(comment);
    invalidateForDiscussionSync(discussionId); // new reply invalidates relevant cache
    return comment;
}

function findById(id) {
    return db.comments.find((c) => c.id === id) || null;
}

function setFlagged(id, flagged, reason) {
    const comment = findById(id);
    if (!comment) return null;
    comment.flagged = Boolean(flagged);
    comment.flagReason = flagged ? reason || "Reported by user" : null;
    return comment;
}

function setHidden(id, hidden) {
    const comment = findById(id);
    if (!comment) return null;
    comment.hidden = Boolean(hidden);
    return comment;
}

function listAll() {
    return db.comments;
}

module.exports = { serialize, findByDiscussion, create, findById, setFlagged, setHidden, listAll };
