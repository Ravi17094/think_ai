/**
 * Forum module data layer (in-memory).
 *
 * Everything the Forum / Moderation / Checkout-discount features need lives
 * here so the module stays fully self-contained from other Thinkz AI modules.
 *
 * PRODUCTION FORUM CONTENT is seeded exclusively from the client-provided
 * files (see src/services/forum/forumDataService.js). Zero mock or generated
 * discussions/comments are allowed — the seed service verifies this on load.
 */

const crypto = require("crypto");

const forumDataService = require("../services/forum/forumDataService");
const notificationDefaults = require("../../config/notification-defaults");

function makeId(prefix) {
    return `${prefix}_${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Platform identities (mock auth demo users, NOT forum content)
// ---------------------------------------------------------------------------

const platformUsers = [
    { id: "u1", name: "Aarav Sharma", username: "aarav", email: "aarav@thinkz.ai", role: "Learner", banned: false },
    { id: "u2", name: "Priya Nair", username: "priya", email: "priya@thinkz.ai", role: "Learner", banned: false },
    { id: "u3", name: "Rahul Verma", username: "rahul", email: "rahul@thinkz.ai", role: "Instructor", banned: false },
    { id: "u4", name: "Sneha Iyer", username: "sneha", email: "sneha@thinkz.ai", role: "Learner", banned: false },
    { id: "u5", name: "Vikram Rao", username: "vikram", email: "vikram@thinkz.ai", role: "TA", banned: false },
    { id: "u6", name: "Meera Joshi", username: "meera", email: "meera@thinkz.ai", role: "Moderator", banned: false },
    { id: "u7", name: "Dev Patel", username: "devpatel", email: "dev@thinkz.ai", role: "Learner", banned: false },
    { id: "u8", name: "Admin One", username: "admin", email: "admin@thinkz.ai", role: "Admin", banned: false }
];

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6"];

// ---------------------------------------------------------------------------
// Client community members (real client community team + moderators)
// ---------------------------------------------------------------------------

const clientModerators = forumDataService.loadClientModerators();

/** email (lowercased) -> user record */
const USER_BY_EMAIL = new Map();
platformUsers.forEach((user) => USER_BY_EMAIL.set(user.email.toLowerCase(), user));

const clientModeratorUsers = clientModerators.map((moderator, index) => {
    const user = {
        id: `u-mo-${index + 1}`,
        name: moderator.name || moderator.email,
        username: moderator.email ? moderator.email.split("@")[0] : `moderator${index + 1}`,
        email: moderator.email.toLowerCase(),
        role: "Moderator",
        banned: false
    };
    USER_BY_EMAIL.set(user.email, user);
    return user;
});

const authorEmails = forumDataService.collectAuthorEmails();
const clientAuthorUsers = authorEmails
    .filter((email) => !USER_BY_EMAIL.has(email))
    .map((email, index) => {
        const localPart = email.split("@")[0];
        const user = {
            id: `u-author-${index + 1}`,
            name: localPart.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            username: localPart,
            email,
            role: "Learner",
            banned: false
        };
        USER_BY_EMAIL.set(email, user);
        return user;
    });

const users = [...platformUsers, ...clientModeratorUsers, ...clientAuthorUsers];

// ---------------------------------------------------------------------------
// Role assignment (users <-> roles junction)
// ---------------------------------------------------------------------------

/**
 * userRoles maps a userId to the list of role ids granted. The real client
 * community managers from client-moderators-prod.csv are assigned the
 * "moderator" role here (permission set defined in config/forum.config.js).
 */
const userRoles = {};
clientModeratorUsers.forEach((user) => {
    userRoles[user.id] = ["moderator"];
});
platformUsers
    .filter((user) => user.role === "Moderator" || user.role === "Admin")
    .forEach((user) => {
        userRoles[user.id] = user.role === "Admin" ? ["administrator", "moderator"] : ["moderator"];
    });

// ---------------------------------------------------------------------------
// Categories (merged from client seed + announcements)
// ---------------------------------------------------------------------------

const categories = forumDataService.buildCategories();

const CATEGORY_ID_BY_NAME = {};
categories.forEach((category) => {
    CATEGORY_ID_BY_NAME[category.name.toLowerCase()] = category.id;
});

// ---------------------------------------------------------------------------
// Discussions + comments (REAL client-provided content only)
// ---------------------------------------------------------------------------

function resolveUserIdByEmail(email) {
    const user = USER_BY_EMAIL.get(String(email || "").toLowerCase());
    return user ? user.id : null;
}

const rawDiscussions = forumDataService.buildDiscussions();
const discussions = rawDiscussions.map((thread) => ({
    id: thread.id,
    title: thread.title,
    body: thread.body,
    authorId: resolveUserIdByEmail(thread.authorEmail) || "u1",
    tags: thread.tags,
    categoryId: CATEGORY_ID_BY_NAME[thread.categoryName.toLowerCase()] || "c-general",
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    solved: Boolean(thread.solved),
    hidden: Boolean(thread.hidden),
    flagged: Boolean(thread.flagged),
    flagReason: thread.flagReason || null,
    pinned: Boolean(thread.pinned),
    views: thread.views || 0,
    upvotes: thread.upvotes || 0,
    downvotes: thread.downvotes || 0
}));

const commentsSeed = forumDataService.buildComments();
const comments = commentsSeed.map((comment) => ({
    ...comment,
    authorId: resolveUserIdByEmail(comment.authorEmail) || "u1"
}));

// ---------------------------------------------------------------------------
// Tags (client tag taxonomy)
// ---------------------------------------------------------------------------

const tags = forumDataService.buildTags();

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

const votes = new Map();

function votesFor(discussionId) {
    if (!votes.has(discussionId)) {
        votes.set(discussionId, new Map());
    }
    return votes.get(discussionId);
}

// ---------------------------------------------------------------------------
// Bookmarks (client seed + admin pre-bookmarks for new-user onboarding)
// ---------------------------------------------------------------------------

// Admin-account pre-bookmarks for the new-user onboarding collection.
function onboardingBookmarks() {
    const collection = "new-user-onboarding";
    const resourceThreadIds = [
        "d-ann-guidelines",
        "d-ann-onboarding",
        "d-ann-ama",
        "d6"
    ];
    const createdAt = "2026-09-15T09:00:00.000Z";
    return resourceThreadIds.map((discussionId, index) => ({
        id: makeId("bk"),
        userId: "u8",
        discussionId,
        collection,
        createdAt: createdAtIndex(createdAt, index)
    }));
}

function createdAtIndex(base, index) {
    return new Date(new Date(base).getTime() + index * 60000).toISOString();
}

function seededBookmarks() {
    const seed = require("../../data/client-forum-seed-prod.json").bookmarks || [];
    return seed.map((b) => ({
        id: makeId("bk"),
        userId: b.userId,
        discussionId: b.discussionId,
        collection: "personal",
        createdAt: b.createdAt || new Date().toISOString()
    }));
}

const bookmarks = [...seededBookmarks(), ...onboardingBookmarks()];

// ---------------------------------------------------------------------------
// Notifications + preferences
// ---------------------------------------------------------------------------

const notifications = [];

const notificationPrefs = {};
users.forEach((user) => {
    notificationPrefs[user.id] = { email: true, inApp: true, sms: false };
});

// Event-scoped defaults (config/notification-defaults.js): each user inherits
// the client-mandated channel routing for new-reply / mention / moderator-action.
const notificationEventPrefs = {};
users.forEach((user) => {
    notificationEventPrefs[user.id] = {};
    Object.keys(notificationDefaults.notificationDefaults).forEach((event) => {
        notificationEventPrefs[user.id][event] = notificationDefaults.getNotificationDefaults(event);
    });
});

// ---------------------------------------------------------------------------
// Moderation state
// ---------------------------------------------------------------------------

/** Resolved reports: { id, contentType, contentId, reporterUserId, reason, createdAt } */
const reports = [];

/** Email intents for events routed exclusively to email (moderator-action). */
const pendingEmails = [];

// ---------------------------------------------------------------------------
// Live Class Studio sessions (owned by the Studio module, unchanged)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function isoAgo(days, hourOffset) {
    return new Date(Date.UTC(2026, 7, 24, 12, 0, 0) - days * DAY_MS + (hourOffset || 0) * 3600 * 1000).toISOString();
}

const studioSessions = [
    {
        id: "s1",
        title: "React Hooks Deep Dive — Live Class",
        hostId: "u1",
        status: "live",
        startedAt: isoAgo(0, -1),
        attendees: [
            { userId: "u1", name: "Aarav Sharma", online: true, muted: true, cameraOn: false, raisedHand: false },
            { userId: "u2", name: "Priya Nair", online: true, muted: true, cameraOn: true, raisedHand: true },
            { userId: "u4", name: "Sneha Iyer", online: false, muted: true, cameraOn: false, raisedHand: false },
            { userId: "u7", name: "Dev Patel", online: true, muted: true, cameraOn: false, raisedHand: false }
        ],
        polls: [
            {
                id: makeId("poll"),
                question: "Which hook should we refactor first?",
                options: [
                    { id: makeId("opt"), text: "useState", votes: 7 },
                    { id: makeId("opt"), text: "useEffect", votes: 11 },
                    { id: makeId("opt"), text: "useMemo", votes: 3 }
                ],
                status: "open",
                createdAt: isoAgo(0, -1)
            }
        ],
        messages: [
            { id: makeId("msg"), userId: "u2", userName: "Priya Nair", text: "Audio is clear on my side.", timestamp: isoAgo(0, -1), deleted: false },
            { id: makeId("msg"), userId: "u1", userName: "Aarav Sharma", text: "Can we revisit the cleanup function example?", timestamp: isoAgo(0), deleted: false }
        ]
    }
];

// ---------------------------------------------------------------------------
// Runtime sanity check: production forum content MUST come from client files.
// ---------------------------------------------------------------------------

const mockCheck = forumDataService.verifyZeroMockContent({ discussions, comments });
if (!mockCheck.ok) {
    // Loaded module is expected to be safe; guard against regressions loudly.
    console.error("[forum] ZERO-mock-content check failed:", mockCheck.violations);
}

module.exports = {
    makeId,
    users,
    avatarColors: AVATAR_COLORS,
    categories,
    discussions,
    comments,
    tags,
    votesFor,
    bookmarks,
    notifications,
    notificationPrefs,
    notificationEventPrefs,
    userRoles,
    reports,
    pendingEmails,
    studioSessions,
    community: {
        moderators: clientModeratorUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })),
        pinnedThreadIds: forumDataService.pinnedThreadIds(),
        seedingReport: forumDataService.seedingReport()
    }
};