const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./src/data/mockData");
const { listDiscussions, listHotThreads } = require("./src/services/discussionService");
const Discussion = require("./src/models/Discussion");
const Comment = require("./src/models/Comment");
const { forumPerformanceService: perf } = require("./src/services/forum/perf/forumPerformanceService");
const { createForumCache, CACHE_TTL_MS } = require("./src/services/forum/perf/forumRedisCache");
const { createForumPerformanceService } = require("./src/services/forum/perf/forumPerformanceService");
const { SearchPerformanceTracer } = require("./src/services/forum/perf/searchPerformanceTracer");
const {
    matchScoreFor,
    rankByRelevance,
    buildGinSearchSql,
    searchUsingPostgres,
} = require("./src/services/forum/perf/fullTextSearchService");
const {
    FORUM_INDEX_SQL,
    FORUM_FTS_TRIGGER_SQL,
    applyForumIndexes,
} = require("./src/services/forum/perf/forumIndexes");

const POST_COUNT = 1000;
const SEED_TOKEN = "fts-benchmark-target";

function seedPosts(count) {
    const originalLength = db.discussions.length;
    const now = Date.now();
    for (let i = 0; i < count; i += 1) {
        db.discussions.push({
            id: db.makeId("d"),
            title: `Benchmark post #${i} ${SEED_TOKEN}`,
            body: `Discussion body ${i}. The token ${SEED_TOKEN} appears here too.`,
            tags: ["benchmark"],
            categoryId: "c-opensource",
            authorId: "u1",
            createdAt: new Date(now - i * 1000).toISOString(),
            updatedAt: new Date(now - i * 1000).toISOString(),
            solved: false,
            hidden: false,
            flagged: false,
            flagReason: null,
            views: i,
            upvotes: i % 10,
            downvotes: 0,
        });
    }
    return () => {
        db.discussions.length = originalLength;
    };
}

function percentile(sorted, p) {
    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(index, 0)];
}

// ---------------------------------------------------------------
// Database indexes + full-text search definitions
// ---------------------------------------------------------------

test("index DDL declares posts.created_at, posts.solved and a GIN search index", () => {
    assert.match(FORUM_INDEX_SQL, /idx_posts_created_at\s+ON\s+posts\s+\(created_at DESC\)/i);
    assert.match(FORUM_INDEX_SQL, /idx_posts_solved\s+ON\s+posts\s+\(solved\)/i);
    assert.match(FORUM_INDEX_SQL, /USING GIN \(search_vector\)/i);
    assert.match(FORUM_FTS_TRIGGER_SQL, /setweight\(to_tsvector\('english',\s*coalesce\(NEW\.title/);
    assert.match(FORUM_FTS_TRIGGER_SQL, /BEFORE INSERT OR UPDATE OF title, body/);
});

test("applyForumIndexes degrades gracefully without a live pool", async () => {
    const result = await applyForumIndexes(null);
    assert.equal(result.applied, false);
    assert.match(result.reason, /in-memory demo mode/i);

    const brokenPool = { query: async () => { throw new Error("connection refused"); } };
    const failed = await applyForumIndexes(brokenPool);
    assert.equal(failed.applied, false);
});

test("buildGinSearchSql produces a to_tsquery full-text query", () => {
    const { sql, params, tsQuery } = buildGinSearchSql({ table: "posts", searchText: "react hooks", limit: 20 });
    assert.match(sql, /search_vector @@ to_tsquery\('english', \$1\)/);
    assert.match(sql, /ORDER BY rank DESC, created_at DESC/);
    assert.equal(params[0], "react:* & hooks:*"); // prefix AND semantics
    assert.equal(tsQuery, "react:* & hooks:*");
});

test("searchUsingPostgres rejects when no pool is provided", async () => {
    await assert.rejects(
        () => searchUsingPostgres(null, { searchText: "react" }),
        /no PostgreSQL pool available/i
    );
});

// ---------------------------------------------------------------
// Full-text relevance (title weight A > body weight B)
// ---------------------------------------------------------------

test("matchScoreFor honors the title weight above the body weight", () => {
    const titleMatch = { id: "d-title", title: "React Hooks Explained", body: "nothing relevant here", tags: [] };
    const bodyMatch = { id: "d-body", title: "Unrelated heading", body: "this covers react hooks deeply", tags: [] };

    const score = matchScoreFor("react hooks");
    assert.ok(score(titleMatch) > score(bodyMatch));
    assert.ok(score(titleMatch) > 0);
    assert.ok(score(bodyMatch) > 0);
});

test("rankByRelevance orders title matches above body-only matches", () => {
    const posts = [
        { id: "d-body", title: "Unrelated heading", body: "this covers react hooks deeply", createdAt: "2026-08-01T00:00:00.000Z", tags: [] },
        { id: "d-title", title: "React Hooks Explained", body: "nothing relevant here", createdAt: "2026-08-02T00:00:00.000Z", tags: [] },
    ];
    const ranked = rankByRelevance(posts, "react hooks");
    assert.equal(ranked[0].id, "d-title");
    assert.equal(ranked[1].id, "d-body");
});

test("matchScoreFor filters out non-matching documents entirely", () => {
    const score = matchScoreFor("javascript closures");
    assert.equal(score({ id: "x", title: "Gardening tips", body: "plant care", tags: [], createdAt: "2026-08-01T00:00:00.000Z" }), 0);
});

// ---------------------------------------------------------------
// Cache (Redis 5-min TTL + memory fallback)
// ---------------------------------------------------------------

test("memory cache round-trips values and honors TTL", async () => {
    const cache = createForumCache({ ttlMs: 40 });
    await cache.setSync("a", { n: 1 });
    assert.deepEqual(cache.getSync("a"), { n: 1 });

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(cache.getSync("a"), null); // expired
});

test("search pages and hot-thread listings are served from the 5-minute cache", async () => {
    await perf.flush();
    const restore = seedPosts(200);
    try {
        const query = { search: SEED_TOKEN, sort: "relevance", page: 1, limit: 10 };
        const first = listDiscussions(query, "u1");
        assert.equal(first.cached, false);

        const second = listDiscussions(query, "u1");
        assert.equal(second.cached, true);
        assert.equal(second.total, first.total);
        assert.equal(second.responseTimeMs, 0);

        const hot1 = listHotThreads({ limit: 5, currentUserId: "u1" });
        assert.equal(hot1.cached, false);
        const hot2 = listHotThreads({ limit: 5, currentUserId: "u1" });
        assert.equal(hot2.cached, true);
    } finally {
        restore();
        await perf.flush();
    }
});

test("new post invalidates the search + hot-thread cache", async () => {
    await perf.flush();
    const restore = seedPosts(100);
    try {
        const query = { search: SEED_TOKEN, sort: "relevance", page: 1, limit: 10 };
        listDiscussions(query, "u1");
        listHotThreads({ limit: 5, currentUserId: "u1" });

        Discussion.create({
            title: "A fresh post about something completely new",
            body: "This brand new discussion body.",
            tags: ["fresh"],
            categoryId: "c-general",
            authorId: "u1",
        });

        const afterPost = listDiscussions(query, "u1");
        assert.equal(afterPost.cached, false);
        assert.equal(listHotThreads({ limit: 5, currentUserId: "u1" }).cached, false);
    } finally {
        restore();
        await perf.flush();
    }
});

test("new reply invalidates the hot-thread cache", async () => {
    await perf.flush();
    const restore = seedPosts(100);
    try {
        listHotThreads({ limit: 5, currentUserId: "u1" });
        const target = db.discussions.find((d) => !d.hidden);
        Comment.create({ discussionId: target.id, body: "A new perspective on this thread." });

        const hot = listHotThreads({ limit: 5, currentUserId: "u1" });
        assert.equal(hot.cached, false);
    } finally {
        restore();
        await perf.flush();
    }
});

test("edit (solved toggle) invalidates the relevant cache", async () => {
    await perf.flush();
    const restore = seedPosts(100);
    try {
        const target = db.discussions.find((d) => !d.hidden);
        const query = { solved: false, search: SEED_TOKEN, page: 1, limit: 10 };
        listDiscussions(query, "u1");

        Discussion.setSolved(target.id, true);

        const afterEdit = listDiscussions(query, "u1");
        assert.equal(afterEdit.cached, false);
    } finally {
        restore();
        await perf.flush();
    }
});

// ---------------------------------------------------------------
// SLO: <300ms p95 with 1000+ posts; 50 concurrent searches
// ---------------------------------------------------------------

test("search over 1000 posts keeps p95 < 300ms", async () => {
    await perf.flush();
    const restore = seedPosts(POST_COUNT);
    try {
        for (let page = 1; page <= 40; page += 1) {
            listDiscussions({ search: SEED_TOKEN, sort: "relevance", page, limit: 10 }, "u1");
        }
        const snapshot = perf.latencySnapshot();
        assert.ok(snapshot.count >= 40, `expected >=40 samples, got ${snapshot.count}`);
        assert.ok(snapshot.p95 < 300, `p95 exceeded 300ms: ${snapshot.p95}ms`);
    } finally {
        restore();
        await perf.flush();
    }
});

test("50 concurrent searches over 1000+ posts keep p95 < 300ms", async () => {
    await perf.flush();
    const restore = seedPosts(1100);
    try {
        const CONCURRENCY = 50;
        const run = (i) =>
            new Promise((resolve) => {
                setImmediate(() => {
                    const result = listDiscussions(
                        { search: `${SEED_TOKEN}-${i}`, sort: "relevance", page: 1, limit: 10 },
                        "u1"
                    );
                    resolve(result.responseTimeMs);
                });
            });

        const times = await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => run(i)));
        const sorted = [...times].sort((a, b) => a - b);
        const p95 = percentile(sorted, 95);

        assert.equal(times.length, CONCURRENCY);
        assert.ok(p95 < 300, `p95 exceeded 300ms under 50 concurrent searches: ${p95}ms`);
    } finally {
        restore();
        await perf.flush();
    }
});

// ---------------------------------------------------------------
// p95 tracer plumbing
// ---------------------------------------------------------------

test("SearchPerformanceTracer computes an accurate p95", () => {
    const tracer = new SearchPerformanceTracer();
    [
        10, 12, 14, 16, 18, 20, 22, 24, 26, 100,
    ].forEach((ms) => tracer.record(ms));
    assert.equal(tracer.count(), 10);
    // p95 of 10 samples -> element index ceil(0.95*10)-1 = 9 -> 100
    assert.equal(tracer.p95(), 100);
    tracer.reset();
    assert.equal(tracer.count(), 0);
    assert.equal(tracer.p95(), 0);
});

test("custom forum performance service supports isolated caching", async () => {
    const service = createForumPerformanceService({ cache: createForumCache({ ttlMs: 40 }) });
    await service.setHotThreadsSync({ items: ["x"] });
    assert.deepEqual(service.getHotThreadsSync(), { items: ["x"] });

    await service.invalidateSearchesSync();
    assert.equal(service.getHotThreadsSync(), null);
    assert.equal(service.constants.CACHE_TTL_SECONDS, CACHE_TTL_MS / 1000);
});