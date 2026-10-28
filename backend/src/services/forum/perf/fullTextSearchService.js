// ============================================================
// Forum Performance — full-text search (PostgreSQL GIN + mirror)
// ============================================================
// Mirrors how PostgreSQL full-text search works with the GIN
// `search_vector` index:
//
//   * texts are normalized to search "documents"
//   * title carries weight A, body weight B (like setweight/to_tsvector)
//   * matching is prefix-aware (to_tsquery `term:*`), terms joined with AND
//   * results are ranked by weight then recency
//
// The in-memory matcher (`matchScore` / `rankByRelevance`) is used by the
// demo backend so behaviour matches production PG semantics without a live
// DB. `buildGinSearchSql` / `searchUsingPostgres` target a real Postgres
// pool when one is supplied.
// ============================================================

const { normalizeText, tokenize, buildTsQuery, tsQueryFromSearchText } = (() => {
    const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "for", "in", "on", "with"]);

    function normalizeText(text) {
        return String(text || "").toLowerCase();
    }

    function tokenize(text) {
        return normalizeText(text)
            .split(/[^a-z0-9]+/)
            .filter(Boolean)
            .filter((token) => !STOP_WORDS.has(token));
    }

    function buildTsQuery(searchText) {
        const terms = tokenize(searchText);
        if (terms.length === 0) {
            return "";
        }
        return terms.map((term) => `${term}:*`).join(" & ");
    }

    // Alias kept for readability at call sites.
    function tsQueryFromSearchText(searchText) {
        return buildTsQuery(searchText);
    }

    return { normalizeText, tokenize, buildTsQuery, tsQueryFromSearchText };
})();

// ------------------------------------------------------------
// In-memory document vectors (tsvector mirror)
// ------------------------------------------------------------

const vectorCache = new Map(); // discussionId -> { title, body, tagsText, tokens }

function buildVector(discussion) {
    const title = normalizeText(discussion.title);
    const body = normalizeText(discussion.body);
    const tagsText = (discussion.tags || []).map(normalizeText).join(" ");
    return {
        title,
        body,
        tagsText,
        tokens: new Set([...tokenize(title), ...tokenize(body), ...tokenize(tagsText)]),
    };
}

function vectorFor(discussion) {
    let vector = vectorCache.get(discussion.id);
    if (!vector) {
        vector = buildVector(discussion);
        vectorCache.set(discussion.id, vector);
    }
    return vector;
}

function resetVectorCache() {
    vectorCache.clear();
}

/**
 * Relevance score for a discussion against a search query.
 * Mirrors PG ranking: title match (weight A) dominates body (weight B).
 * Substring matching is preserved for parity with the classic search bar.
 * Returns 0 when the discussion does not match at all.
 */
function matchScoreFor(query) {
    const normalized = normalizeText(query).trim();
    if (!normalized) {
        return () => 0;
    }

    return (discussion) => {
        const vector = vectorFor(discussion);
        if (vector.tokens.size === 0) return 0;

        // Prefix-aware matching like `to_tsquery('term:*')` — the terms of
        // the query must all match to count (AND semantics).
        const terms = tokenize(normalized);
        if (terms.length === 0) {
            // Pure punctuation/noise query → fall back to raw substring.
            if (vector.title.includes(normalized) || vector.body.includes(normalized)) return 1;
            return 0;
        }

        let matchedTerms = 0;
        for (const term of terms) {
            const hits = [...vector.tokens].filter((token) => token.startsWith(term));
            if (hits.length === 0) return 0; // AND semantics: every term must match
            matchedTerms += 1;
        }
        if (matchedTerms < terms.length) return 0;

        // Weight A (title) counts double.
        let score = 0;
        const titleTerms = new Set(tokenize(vector.title));
        const bodyTerms = new Set(tokenize(vector.body));
        const titleHits = terms.filter((term) => titleTerms.has(term)).length;
        const bodyHits = terms.filter((term) => bodyTerms.has(term)).length;
        score += titleHits * 2 + bodyHits * 1;
        if (vector.tagsText && terms.some((term) => vector.tagsText.includes(term))) {
            score += 1;
        }
        return score;
    };
}

function rankByRelevance(matches, searchText) {
    const score = matchScoreFor(searchText);
    return matches
        .map((discussion) => ({ discussion, relevance: score(discussion) }))
        .filter((entry) => entry.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance || new Date(b.discussion.createdAt) - new Date(a.discussion.createdAt))
        .map((entry) => entry.discussion);
}

// ------------------------------------------------------------
// Real PostgreSQL helpers (GIN search_vector)
// ------------------------------------------------------------

/**
 * Build a `ts_rank_cd`-ordered full-text query against the GIN
 * `posts.search_vector` index.
 */
function buildGinSearchSql({ table = "posts", searchText, limit = 20, offset = 0 }) {
    const tsQuery = buildTsQuery(searchText);
    return {
        sql: `
SELECT id,
       ts_rank_cd(search_vector, to_tsquery('english', $1)) AS rank
  FROM ${table}
 WHERE search_vector @@ to_tsquery('english', $1)
 ORDER BY rank DESC, created_at DESC
 LIMIT $2 OFFSET $3`,
        params: [tsQuery, Math.min(limit, 100), offset || 0],
        tsQuery,
    };
}

/**
 * Run a search against a live Postgres pool. Resolves with the matching row
 * ids ordered by rank. Rejects when no pool is provided.
 */
async function searchUsingPostgres(pool, { searchText, limit = 20, offset = 0, table = "posts" }) {
    if (!pool || typeof pool.query !== "function") {
        throw new Error("forum-search-pg: no PostgreSQL pool available (in-memory demo mode)");
    }
    const { sql, params } = buildGinSearchSql({ table, searchText, limit, offset });
    const { rows } = await pool.query(sql, params);
    return rows;
}

module.exports = {
    normalizeText,
    tokenize,
    buildTsQuery,
    tsQueryFromSearchText,
    vectorFor,
    resetVectorCache,
    matchScoreFor,
    rankByRelevance,
    buildGinSearchSql,
    searchUsingPostgres,
};