// ============================================================
// Forum Performance — orchestration service
// ============================================================
// Facade the forum module uses for the production hardening work:
//
//   * hot-thread ranking cached in Redis for 5 minutes
//   * search result pages cached for 5 minutes
//   * cache invalidation on new post / new reply / edit
//   * p95 latency tracking for the <300ms SLO
//   * PostgreSQL GIN full-text search helper surface
//
// All cache calls go through `forumRedisCache`; swap `REDIS_URL` to move the
// fallback memory store to a real Redis connection without changing callers.
// ============================================================

const {
    createForumCache,
    CACHE_TTL_MS,
    HOT_THREADS_KEY,
    LIST_KEY_PREFIX,
} = require("./forumRedisCache");
const { SearchPerformanceTracer } = require("./searchPerformanceTracer");
const fullTextSearch = require("./fullTextSearchService");

const SLOW_SEARCH_WARN_MS = 300;

function createForumPerformanceService({ cache } = {}) {
    const store = cache || createForumCache();
    const tracer = new SearchPerformanceTracer();

    const hotThreadsKey = () => HOT_THREADS_KEY;
    const listKey = (query, userId) =>
        `${LIST_KEY_PREFIX}${userId || "anon"}:${JSON.stringify(query)}`;

    return {
        // ---- cache store -------------------------------------------------
        cache: store,
        mode: store.mode,

        // ---- hot threads -------------------------------------------------
        async getHotThreads() {
            return store.get(hotThreadsKey());
        },
        async setHotThreads(payload) {
            return store.set(hotThreadsKey(), payload);
        },
        // Sync CUD-aligned accessors used by the demo in-memory pipeline.
        getHotThreadsSync() {
            return store.getSync(hotThreadsKey());
        },
        setHotThreadsSync(payload) {
            return store.setSync(hotThreadsKey(), payload);
        },

        // ---- search result pages ------------------------------------------
        async getSearchResults(key) {
            return store.get(key);
        },
        async setSearchResults(key, payload) {
            return store.set(key, payload);
        },
        getSearchResultsSync(key) {
            return store.getSync(key);
        },
        setSearchResultsSync(key, payload) {
            return store.setSync(key, payload);
        },
        searchKey(listQuery, userId) {
            return listKey(listQuery, userId);
        },

        // ---- invalidation (new post / reply / edit) -----------------------
        async invalidateForDiscussion(discussionId) {
            await store.delMatching(`${LIST_KEY_PREFIX}*`);
            await store.delMatching(`forum:detail:${discussionId}*`);
            await store.del(HOT_THREADS_KEY);
        },
        async invalidateSearches() {
            await store.delMatching(`${LIST_KEY_PREFIX}*`);
            await store.del(HOT_THREADS_KEY);
        },
        // Sync variants used by the in-memory forum models on write paths.
        invalidateForDiscussionSync(discussionId) {
            store.delMatchingSync(`${LIST_KEY_PREFIX}*`);
            store.delMatchingSync(`forum:detail:${discussionId}*`);
            store.delMatchingSync(HOT_THREADS_KEY);
        },
        invalidateSearchesSync() {
            store.delMatchingSync(`${LIST_KEY_PREFIX}*`);
            store.delMatchingSync(HOT_THREADS_KEY);
        },
        async flush() {
            await store.flush();
            tracer.reset();
        },

        // ---- p95 latency ------------------------------------------------
        recordLatency(milliseconds) {
            tracer.record(milliseconds);
            if (milliseconds > SLOW_SEARCH_WARN_MS) {
                console.warn(`[PERF] Slow forum query (${milliseconds}ms) — SLO is <${SLOW_SEARCH_WARN_MS}ms p95`);
            }
            return milliseconds;
        },
        latencySnapshot() {
            return { ...tracer.snapshot(), sloMs: SLOW_SEARCH_WARN_MS };
        },
        latencyPercentile(p) {
            return tracer.percentile(p);
        },
        tracer,

        // ---- full-text search helpers ------------------------------------
        fts: fullTextSearch,
        constants: { CACHE_TTL_SECONDS: CACHE_TTL_MS / 1000 },
    };
}

const defaultService = createForumPerformanceService();

module.exports = {
    createForumPerformanceService,
    forumPerformanceService: defaultService,
    SLOW_SEARCH_WARN_MS,
};