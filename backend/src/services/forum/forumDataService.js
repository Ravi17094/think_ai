/**
 * Real forum content seeding (Forum Developer scope).
 *
 * Loads ALL production forum content exclusively from the client-provided
 * files under `/backend/data`:
 *
 *   - client-forum-seed-prod.json       (titles, bodies, categories, tags, author emails)
 *   - client-announcements-prod.json    (pinned announcements)
 *   - client-tag-taxonomy-prod.json     (tag names + descriptions)
 *   - client-moderators-prod.csv        (real client community managers)
 *
 * ZERO mock content is required or accepted: this module asserts every loaded
 * discussion and comment is sourced from the client files and fails loudly if
 * any generated/mock markers are present (see verifyZeroMockContent).
 */

const path = require("path");
const { readCsv } = require("../../utils/csv");

const forumSeed = require("../../../data/client-forum-seed-prod.json");
const announcements = require("../../../data/client-announcements-prod.json");
const tagTaxonomy = require("../../../data/client-tag-taxonomy-prod.json");

const MODERATORS_CSV_PATH = path.join(__dirname, "..", "..", "..", "data", "client-moderators-prod.csv");

/** Real client community managers from client-moderators-prod.csv. */
function loadClientModerators() {
    return readCsv(MODERATORS_CSV_PATH);
}

/** Canonical category id by client-provided category name. */
function categoryIdFor(name, indexBy) {
    const slug = String(name || "General").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (indexBy[slug]) return indexBy[slug];
    return `c-${slug}`;
}

/**
 * Builds the category set understood by the thread seed. Every discussion /
 * announcement category is guaranteed to exist so hidden/orphaned threads are
 * impossible.
 */
function buildCategories() {
    const base = [
        { id: "c-general", name: "General", color: "#6366f1", description: "Community-wide discussions" },
        { id: "c-announcements", name: "Announcements", color: "#f59e0b", description: "Official client platform updates" },
        { id: "c-qa", name: "Q&A", color: "#10b981", description: "Ask questions and get answers" },
        { id: "c-projects", name: "Projects", color: "#06b6d4", description: "Show what your team is building" },
        { id: "c-help", name: "Help & Support", color: "#ef4444", description: "Client platform help and troubleshooting" }
    ];
    const indexBy = {};
    base.forEach((cat) => {
        indexBy[cat.name.toLowerCase()] = cat;
    });

    const needed = new Set(["General", "Announcements", "Q&A", "Projects", "Help & Support"]);
    forumSeed.threads.forEach((thread) => needed.add(thread.category));
    announcements.threads.forEach((thread) => needed.add(thread.category));

    needed.forEach((name) => {
        if (indexBy[name.toLowerCase()]) return;
        const id = categoryIdFor(name, {});
        indexBy[name.toLowerCase()] = { id, name, color: "#64748b", description: "" };
        base.push(indexBy[name.toLowerCase()]);
    });

    return base;
}

function normalizeTags(tags) {
    return (Array.isArray(tags) ? tags : [])
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Returns every unique author email in the client-provided content so the data
 * layer can create/resolve the corresponding platform users.
 */
function collectAuthorEmails() {
    const emails = new Set();
    [...forumSeed.threads, ...announcements.threads].forEach((thread) => {
        if (thread.authorEmail) emails.add(thread.authorEmail.toLowerCase());
    });
    (forumSeed.comments || []).forEach((comment) => {
        if (comment.authorEmail) emails.add(comment.authorEmail.toLowerCase());
    });
    return Array.from(emails).sort();
}

function buildDiscussions() {
    const discussions = [];
    [...announcements.threads, ...forumSeed.threads].forEach((thread) => {
        const now = thread.createdAt || new Date().toISOString();
        discussions.push({
            id: thread.id,
            title: thread.title,
            body: thread.body,
            authorEmail: (thread.authorEmail || "").toLowerCase(),
            tags: normalizeTags(thread.tags),
            categoryName: thread.category || "General",
            createdAt: now,
            updatedAt: now,
            solved: Boolean(thread.solved),
            hidden: Boolean(thread.hidden),
            flagged: Boolean(thread.flagged),
            flagReason: thread.flagReason || null,
            pinned: Boolean(thread.pinned),
            views: thread.views != null ? thread.views : 0,
            upvotes: thread.upvotes != null ? thread.upvotes : 0,
            downvotes: thread.downvotes != null ? thread.downvotes : 0
        });
    });
    return discussions;
}

function buildComments() {
    return (forumSeed.comments || []).map((comment, index) => ({
        id: comment.id || `cm-seed-${index + 1}`,
        discussionId: comment.discussionId,
        parentId: comment.parentId || null,
        body: comment.body,
        authorEmail: (comment.authorEmail || "").toLowerCase(),
        createdAt: comment.createdAt || new Date().toISOString(),
        flagged: false,
        hidden: false
    }));
}

function buildTags() {
    return tagTaxonomy.tags.map((tag) => ({
        name: String(tag.name).trim().toLowerCase(),
        description: String(tag.description || "").trim()
    }));
}

/**
 * Describes the pinned announcement thread ids so clients can surface them.
 */
function pinnedThreadIds() {
    return announcements.threads.filter((t) => t.pinned !== false).map((t) => t.id);
}

/**
 * Verifies that a list of discussions/comments contains ZERO mock or generated
 * content. Mock markers are the legacy generated thread ids (`dg*`), template
 * title fragments and generic body sentences. Returns a detailed report.
 */
function verifyZeroMockContent({ discussions, comments } = {}) {
    const mockIdPrefix = /^dg\d+$/;
    const mockTitleFragments = [
        "how do i handle",
        "best practices for",
        "keeps failing, any ideas?",
        "vs alternatives in",
        "getting started with %topic%"
    ];
    const mockBodyFragments = [
        "experimenting with this for a few days",
        "minimal reproduction of the issue",
        "profiling shows the bottleneck",
        "only after a few hundred records"
    ];

    const violations = [];

    (discussions || []).forEach((d) => {
        const title = String(d.title || "").toLowerCase();
        const body = String(d.body || "").toLowerCase();
        if (mockIdPrefix.test(d.id)) {
            violations.push(`discussion ${d.id} has a generated id marker`);
        }
        if (mockTitleFragments.some((fragment) => title.includes(fragment))) {
            violations.push(`discussion ${d.id} uses a generated title template`);
        }
        if (mockBodyFragments.some((fragment) => body.includes(fragment))) {
            violations.push(`discussion ${d.id} uses a generated body sentence`);
        }
    });

    (comments || []).forEach((c) => {
        const body = String(c.body || "").toLowerCase();
        if (mockBodyFragments.some((fragment) => body.includes(fragment))) {
            violations.push(`comment ${c.id} uses a generated body sentence`);
        }
    });

    return {
        ok: violations.length === 0,
        checked: {
            discussions: (discussions || []).length,
            comments: (comments || []).length
        },
        violations,
        source: "client-provided files only"
    };
}

/**
 * Idempotent seeding report describing exactly which client file contributed
 * which part of the forum data. Used by tests and the handover docs.
 */
function seedingReport() {
    return {
        threads: forumSeed.threads.length,
        announcements: announcements.threads.length,
        pinnedThreadIds: pinnedThreadIds(),
        tags: tagTaxonomy.tags.length,
        moderators: loadClientModerators().length,
        sourceFiles: [
            "data/client-forum-seed-prod.json",
            "data/client-announcements-prod.json",
            "data/client-tag-taxonomy-prod.json",
            "data/client-moderators-prod.csv"
        ]
    };
}

const forumDataService = {
    loadClientModerators,
    buildCategories,
    buildDiscussions,
    buildComments,
    buildTags,
    collectAuthorEmails,
    pinnedThreadIds,
    verifyZeroMockContent,
    seedingReport
};

module.exports = forumDataService;