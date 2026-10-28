const Discussion = require("../models/Discussion");
const db = require("../data/mockData");
const { forumPerformanceService: perf } = require("./forum/perf/forumPerformanceService");
const { matchScoreFor } = require("./forum/perf/fullTextSearchService");

const TITLE_MIN = 5;
const TITLE_MAX = 150;
const BODY_MIN = 10;
const BODY_MAX = 5000;

const HOT_THREAD_DEFAULT_LIMIT = 5;
const HOT_THREAD_DEFAULT_RANGE = 30; // days of recency consideration

function validateDiscussionInput({ title, body }) {
    const errors = {};
    const trimmedTitle = String(title || "").trim();
    const trimmedBody = String(body || "").trim();

    if (!trimmedTitle) errors.title = "Title is required";
    else if (trimmedTitle.length < TITLE_MIN) errors.title = `Title must be at least ${TITLE_MIN} characters`;
    else if (trimmedTitle.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters`;

    if (!trimmedBody) errors.body = "Body is required";
    else if (trimmedBody.length < BODY_MIN) errors.body = `Body must be at least ${BODY_MIN} characters`;
    else if (trimmedBody.length > BODY_MAX) errors.body = `Body must be at most ${BODY_MAX} characters`;

    return { valid: Object.keys(errors).length === 0, errors, trimmedTitle, trimmedBody };
}

/**
 * Server-side search + filtering + sorting + pagination.
 * Optimized for the 1000+ posts SLO:
 *   - PostgreSQL-style full-text matching via the prebuilt document vectors
 *     (title = weight A, body = weight B; prefix-aware AND terms).
 *   - search pages + hot-thread list cached for 5 minutes (Redis TTL cache
 *     with in-memory fallback), invalidated on new post / reply / edit.
 *   - p95 latency tracked by the SearchPerformanceTracer (<300ms SLO).
 */
function listDiscussions(query, currentUserId) {
    const startTime = Date.now();
    const {
        search,
        tag,
        author,
        solved,
        categoryId,
        dateFrom,
        dateTo,
        sort,
        page,
        limit
    } = query;

    const searchText = String(search || "").trim().toLowerCase();
    const tagFilter = String(tag || "").trim().toLowerCase();
    const authorFilter = String(author || "").trim().toLowerCase();
    let solvedFilter = null;
    if (solved === "true" || solved === true) solvedFilter = true;
    else if (solved === "false" || solved === false) solvedFilter = false;

    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).getTime() : null;

    // Cache key covers every filter + pagination + viewer. The viewer is part
    // of the key because serialization carries per-user vote state.
    const cacheKey = perf.searchKey({ search, tag, author, solved, categoryId, dateFrom, dateTo, sort, page, limit }, currentUserId);
    const cached = perf.getSearchResultsSync(cacheKey);
    if (cached) {
        return { ...cached, cached: true, responseTimeMs: 0 };
    }

    // Resolve the author filter against id, username and display name up front.
    let authorIds = null;
    if (authorFilter) {
        authorIds = new Set();
        db.users.forEach((u) => {
            if (
                u.id.toLowerCase().includes(authorFilter) ||
                u.username.toLowerCase().includes(authorFilter) ||
                u.name.toLowerCase().includes(authorFilter)
            ) {
                authorIds.add(u.id);
            }
        });
    }

    // Prebuilt relevance scorer (tsvector mirror; weight A for title).
    const scoreDiscussion = searchText ? matchScoreFor(searchText) : null;

    const filtered = [];
    const all = Discussion.listAll();

    for (let i = 0; i < all.length; i += 1) {
        const d = all[i];
        if (d.hidden) continue;
        if (scoreDiscussion && !(scoreDiscussion(d) > 0)) continue;
        if (tagFilter && !d.tags.some((t) => t.toLowerCase() === tagFilter)) continue;
        if (categoryId && d.categoryId !== categoryId) continue;
        if (solvedFilter !== null && d.solved !== solvedFilter) continue;
        if (authorIds && !authorIds.has(d.authorId)) continue;
        if (fromTime || toTime) {
            const created = new Date(d.createdAt).getTime();
            if (fromTime && created < fromTime) continue;
            if (toTime && created > toTime) continue;
        }
        filtered.push(d);
    }

    const items = filtered;

    const sortKey = sort || "recent";
    items.sort((a, b) => {
        if (sortKey === "relevance" && scoreDiscussion) {
            const aScore = scoreDiscussion(a);
            const bScore = scoreDiscussion(b);
            if (bScore !== aScore) return bScore - aScore;
        }
        if (sortKey === "votes") return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
        if (sortKey === "title") return a.title.localeCompare(b.title);
        if (sortKey === "views") return b.views - a.views;
        if (sortKey === "relevance" && !scoreDiscussion) return new Date(b.createdAt) - new Date(a.createdAt);
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const total = items.length;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const totalPages = Math.max(Math.ceil(total / limitNum), 1);
    const pageNum = Math.min(Math.max(parseInt(page, 10) || 1, 1), totalPages);
    const start = (pageNum - 1) * limitNum;

    const responseTimeMs = Date.now() - startTime;
    perf.recordLatency(responseTimeMs);

    const result = {
        items: items.slice(start, start + limitNum).map((d) => Discussion.serialize(d, currentUserId)),
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        cached: false,
        responseTimeMs
    };

    // 5-minute TTL cache for the computed page.
    perf.setSearchResultsSync(cacheKey, { ...result, cachedAt: new Date().toISOString() });

    return result;
}

function hotThreadScore(discussion) {
    const now = Date.now();
    const ageDays = Math.max((now - new Date(discussion.createdAt).getTime()) / 86400000, 0.1);
    const velocity = (discussion.upvotes + discussion.downvotes) / ageDays;
    return discussion.views + velocity * 20 + discussion.upvotes * 5;
}

/**
 * Top N active discussions. Cached in the 5-minute TTL Redis cache and
 * invalidated whenever a post/reply/edit mutates the archive.
 */
function listHotThreads({ limit = HOT_THREAD_DEFAULT_LIMIT, currentUserId } = {}) {
    const cached = perf.getHotThreadsSync();
    if (cached) {
        return { ...cached, cached: true };
    }

    const ranked = Discussion.listAll()
        .filter((d) => !d.hidden)
        .map((d) => ({ d, score: hotThreadScore(d) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(parseInt(limit, 10) || HOT_THREAD_DEFAULT_LIMIT, 1))
        .map(({ d }) => Discussion.serialize(d, currentUserId));

    const result = { items: ranked, fetchedAt: new Date().toISOString(), cached: false };
    perf.setHotThreadsSync(result);
    return result;
}

module.exports = { validateDiscussionInput, listDiscussions, listHotThreads, hotThreadScore, TITLE_MIN, BODY_MIN };
