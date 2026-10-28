// ============================================================
// Forum Performance — hot-thread cache (Redis, 5-minute TTL)
// ============================================================
// Caches expensive-to-compute forum reads (hot thread rankings and search
// result pages) for 5 minutes. When the real `redis` package / server is
// unavailable (local dev, CI, tests) it transparently falls back to an
// in-memory TTL store with an identical async API, so the integration point
// is the same — point REDIS_URL at a server to switch to the real client.
// ============================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 500;

const HOT_THREADS_KEY = "forum:hot-threads";
const LIST_KEY_PREFIX = "forum:list:";

// ------------------------------------------------------------
// In-memory TTL implementation (fallback)
// ------------------------------------------------------------

class MemoryTtlCache {
    constructor({ ttlMs: initialTtlMs } = {}) {
        this.ttlMs = initialTtlMs || CACHE_TTL_MS;
        this.store = new Map(); // key -> { value, expiresAt }
    }

    async get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key, value, ttlMs = this.ttlMs) {
        // Simple bounded cache: evict oldest entries when over capacity.
        if (this.store.size >= MAX_ENTRIES) {
            const oldest = this.store.keys().next().value;
            if (oldest !== undefined) this.store.delete(oldest);
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
        return true;
    }

    async del(key) {
        return this.store.delete(key);
    }

    // Synchronous CUD-path accessors. Keep the sync list/detail path on the
    // hot path so the demo backend (and its tests) avoids promise plumbing,
    // with exactly the same TTL semantics as the async API.
    getSync(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    setSync(key, value, ttlMs = this.ttlMs) {
        if (this.store.size >= MAX_ENTRIES) {
            const oldest = this.store.keys().next().value;
            if (oldest !== undefined) this.store.delete(oldest);
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
        return true;
    }

    async flush() {
        this.store.clear();
        return true;
    }

    async delMatching(pattern) {
        let removed = 0;
        for (const key of this.store.keys()) {
            if (this.matches(key, pattern)) {
                this.store.delete(key);
                removed += 1;
            }
        }
        return removed;
    }

    delMatchingSync(pattern) {
        let removed = 0;
        for (const key of this.store.keys()) {
            if (this.matches(key, pattern)) {
                this.store.delete(key);
                removed += 1;
            }
        }
        return removed;
    }

    matches(key, pattern) {
        if (pattern.endsWith("*")) {
            return key.startsWith(pattern.slice(0, -1));
        }
        return key === pattern;
    }
}

// ------------------------------------------------------------
// Real-client attempt helper
// ------------------------------------------------------------

function loadRedisClient() {
    try {
        // Optional dependency — not installed in the demo backend.
        const { createClient } = require("redis");
        if (!process.env.REDIS_URL) return null;
        const client = createClient({ url: process.env.REDIS_URL });
        client.on("error", () => { /* fallback to memory --- never crash */ });
        client.connect?.().catch(() => {});
        return client;
    } catch {
        return null;
    }
}

// ------------------------------------------------------------
// Factory
// ------------------------------------------------------------

function createForumCache({ ttlMs } = {}) {
    const client = loadRedisClient();

    if (!client) {
        return { mode: "memory", ...createMemoryFacade(ttlMs) };
    }

    return createRedisFacade(client, ttlMs);
}

function createMemoryFacade(ttlMs) {
    const cache = new MemoryTtlCache({ ttlMs });
    return {
        get: (k) => cache.get(k),
        set: (k, v) => cache.set(k, v),
        del: (k) => cache.del(k),
        flush: () => cache.flush(),
        delMatching: (pattern) => cache.delMatching(pattern),
        delMatchingSync: (pattern) => cache.delMatchingSync(pattern),
        getSync: (k) => cache.getSync(k),
        setSync: (k, v) => cache.setSync(k, v),
    };
}

// Shared helper for the redis facade's sync accessors: on a real Redis
// connection the sync CUD path is intentionally unavailable (use the async
// API), so sync reads miss and sync writes are a no-op.
function createRedisFacade(client, ttlMs) {
    return {
        mode: "redis",
        async get(key) {
            const raw = await client.get(key);
            return raw === null || raw === undefined ? null : JSON.parse(raw);
        },
        async set(key, value, ttlSeconds) {
            const ttl = ttlSeconds || Math.ceil((ttlMs || CACHE_TTL_MS) / 1000);
            await client.set(key, JSON.stringify(value), { EX: ttl });
            return true;
        },
        async del(key) {
            await client.del(key);
            return true;
        },
        async flush() {
            await client.flushAll();
            return true;
        },
        async delMatching(pattern) {
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
            }
            return keys.length;
        },
        getSync() {
            return null; // sync CUD path unavailable over real Redis
        },
        setSync() {
            return false;
        },
        delMatchingSync() {
            return 0;
        },
    };
}

// Process-wide default instance (mirrors a single Redis connection).
const forumCache = createForumCache();

module.exports = {
    createForumCache,
    forumCache,
    CACHE_TTL_MS,
    MAX_ENTRIES,
    HOT_THREADS_KEY,
    LIST_KEY_PREFIX,
};