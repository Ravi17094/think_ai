// ============================================================
// Search load test — 50 concurrent searches against 1000+ posts
// ============================================================
// Usage: node load-test/search-load-test.js
//
// Seeds the in-memory forum archive with 1000+ posts, then fires 50
// concurrent listDiscussions searches and reports the p95 latency.
// Exits non-zero when p95 >= 300ms (the forum search SLO).
// ============================================================

const db = require("../src/data/mockData");
const { listDiscussions } = require("../src/services/discussionService");
const { forumPerformanceService } = require("../src/services/forum/perf/forumPerformanceService");

const POST_COUNT = 1200;
const CONCURRENCY = 50;
const P95_SLO_MS = 300;
const TOKEN = "load-test-token";

function seedPosts(count) {
    const now = Date.now();
    for (let i = 0; i < count; i += 1) {
        db.discussions.push({
            id: db.makeId("d"),
            title: `Load test post #${i} ${TOKEN} deep dive`,
            body: `Discussion number ${i}. Body also mentions ${TOKEN} for matching.`,
            tags: ["load-test"],
            categoryId: "c-opensource",
            authorId: i % 5 === 0 ? "u2" : "u1",
            createdAt: new Date(now - i * 1000).toISOString(),
            updatedAt: new Date(now - i * 1000).toISOString(),
            solved: i % 3 === 0,
            hidden: false,
            flagged: false,
            flagReason: null,
            views: i,
            upvotes: i % 7,
            downvotes: 0,
        });
    }
}

function percentile(sorted, p) {
    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(index, 0)];
}

async function main() {
    await forumPerformanceService.flush();
    seedPosts(POST_COUNT);
    console.log(`[load-test] seeded ${POST_COUNT} posts`);

    const runSearch = (i) =>
        new Promise((resolve) => {
            setImmediate(() => {
                const started = Date.now();
                const result = listDiscussions(
                    { search: `${TOKEN}-${i}`, sort: "relevance", page: 1, limit: 10 },
                    "u1"
                );
                resolve({
                    measuredMs: Date.now() - started,
                    reportedMs: result.responseTimeMs,
                    matches: result.total,
                    cached: result.cached,
                });
            });
        });

    const startedAt = Date.now();
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => runSearch(i)));
    const wallMs = Date.now() - startedAt;

    const measured = results.map((r) => r.measuredMs).sort((a, b) => a - b);
    const reported = results.map((r) => r.reportedMs).sort((a, b) => a - b);
    const p95Measured = percentile(measured, 95);
    const p95Reported = percentile(reported, 95);

    console.log(`[load-test] ${CONCURRENCY} concurrent searches in ${wallMs}ms wall-clock`);
    console.log(`[load-test] reported latency min/median/p95: ${Math.min(...reported)}ms / ${reported[Math.floor(reported.length / 2)]}ms / ${p95Reported}ms`);
    console.log(`[load-test] measured latency min/median/p95: ${Math.min(...measured)}ms / ${measured[Math.floor(measured.length / 2)]}ms / ${p95Measured}ms`);
    console.log(`[load-test] SLO: < ${P95_SLO_MS}ms p95`);

    if (p95Reported >= P95_SLO_MS) {
        console.error(`[load-test] FAIL: p95 ${p95Reported}ms exceeds the ${P95_SLO_MS}ms SLO`);
        process.exit(1);
    }
    console.log(`[load-test] PASS: p95 ${p95Reported}ms stays under the ${P95_SLO_MS}ms SLO`);
    process.exit(0);
}

main().catch((err) => {
    console.error("[load-test] error:", err);
    process.exit(1);
});