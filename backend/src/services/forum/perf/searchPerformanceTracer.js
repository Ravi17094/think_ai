// ============================================================
// Forum Performance — search performance tracer (p95)
// ============================================================
// Records search/query response times so the forum pipeline can report
// p95 latency and enforce the <300ms p95 SLO for 1000+ posts.
// ============================================================

const DEFAULT_MAX_SAMPLES = 200;

function percentile(sortedAsc, p) {
    if (sortedAsc.length === 0) {
        return 0;
    }
    const index = Math.min(
        sortedAsc.length - 1,
        Math.ceil((p / 100) * sortedAsc.length) - 1
    );
    return sortedAsc[Math.max(index, 0)];
}

class SearchPerformanceTracer {
    constructor(maxSamples = DEFAULT_MAX_SAMPLES) {
        this.maxSamples = maxSamples;
        this.samples = [];
    }

    record(milliseconds) {
        this.samples.push(Number(milliseconds) || 0);
        if (this.samples.length > this.maxSamples) {
            this.samples.splice(0, this.samples.length - this.maxSamples);
        }
    }

    reset() {
        this.samples = [];
    }

    percentile(p) {
        if (this.samples.length === 0) {
            return 0;
        }
        const sorted = [...this.samples].sort((a, b) => a - b);
        return percentile(sorted, p);
    }

    p95() {
        return this.percentile(95);
    }

    count() {
        return this.samples.length;
    }

    snapshot() {
        return {
            count: this.count(),
            p95: this.p95(),
            p99: this.percentile(99),
            max: this.samples.length ? Math.max(...this.samples) : 0,
        };
    }
}

module.exports = { SearchPerformanceTracer, percentile };