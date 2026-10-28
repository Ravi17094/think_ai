// ============================================================
// Forum Performance — PostgreSQL index & full-text search defs
// ============================================================
// Production schema hardening for the forum module:
//   1. posts.created_at  -> index for recent/timeline ordering
//   2. posts.solved      -> index for solved-filtered queries
//   3. posts.category_id -> composite index for category+recent lists
//   4. posts.tags        -> GIN index for tag filters
//   5. posts.search_vector (GIN) + trigger -> PostgreSQL full-text search
//
// The demo backend runs on an in-memory archive, so `applyForumIndexes`
// degrades gracefully when no live Postgres pool is provided. Deploy the
// SQL below against the real DB (or run `prisma db execute`).
// ============================================================

const FORUM_INDEX_SQL = `
-- Index: recent / timeline ordering
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);

-- Index: solved filter
CREATE INDEX IF NOT EXISTS idx_posts_solved ON posts (solved);

-- Index: category browse (category + recency) composite
CREATE INDEX IF NOT EXISTS idx_posts_category_created ON posts (category_id, created_at DESC);

-- Index: tag filters (GIN over array column)
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);

-- Index: full-text search vector (GIN)
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN (search_vector);
`;

const FORUM_FTS_TRIGGER_SQL = `
-- Add the tsvector column if missing (kept separate from the CREATE INDEX
-- so the GIN index above is valid on first deployment).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Keep search_vector in sync with title/body changes.
CREATE OR REPLACE FUNCTION posts_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body,  '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts;
CREATE TRIGGER trg_posts_search_vector
  BEFORE INSERT OR UPDATE OF title, body ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

-- Backfill for existing rows (idempotent per-trigger setup).
UPDATE posts SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body,  '')), 'B');
`;

const FORUM_DDL = [FORUM_INDEX_SQL, FORUM_FTS_TRIGGER_SQL].join("\n");

/**
 * Apply the forum index/FTS DDL against a live `pg` pool.
 * Returns `{ applied: true }` or `{ applied: false, reason }` — never throws.
 */
async function applyForumIndexes(pool) {
    if (!pool) {
        return { applied: false, reason: "No PostgreSQL pool provided (in-memory demo mode)" };
    }
    try {
        await pool.query(FORUM_DDL);
        return { applied: true };
    } catch (err) {
        return { applied: false, reason: err.message };
    }
}

module.exports = {
    FORUM_INDEX_SQL,
    FORUM_FTS_TRIGGER_SQL,
    FORUM_DDL,
    applyForumIndexes,
};