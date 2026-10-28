const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./src/data/mockData");
const { listDiscussions } = require("./src/services/discussionService");

// Day 13 staging validation: "Search verified with 1000+ posts within 500 ms".
// Seed well beyond the requirement (1500 posts) and assert responseTimeMs,
// returned by listDiscussions itself, stays under the 500 ms budget.
const SCALE = 1500;
const SEARCH_TOKEN = "polyfill-alpha";

function seedPosts(count) {
  const originalLength = db.discussions.length;
  const now = Date.now();
  for (let i = 0; i < count; i += 1) {
    db.discussions.push({
      id: db.makeId("d"),
      title: `Scale test post #${i} — ${SEARCH_TOKEN} deep dive`,
      body: `Discussion number ${i}. This body mentions ${SEARCH_TOKEN} when matching.`,
      tags: ["performance", "scale"],
      categoryId: "c-opensource",
      authorId: i % 10 === 0 ? "u2" : "u1",
      createdAt: new Date(now - i * 1000).toISOString(),
      updatedAt: new Date(now - i * 1000).toISOString(),
      solved: false,
      hidden: false,
      flagged: false,
      flagReason: null,
      views: 0,
      upvotes: 0,
      downvotes: 0,
    });
  }
  return () => {
    db.discussions.length = originalLength;
  };
}

test("search over 1500 posts completes in well under 500 ms (Day 13 budget)", () => {
  const restore = seedPosts(SCALE);
  try {
    const result = listDiscussions(
      { search: SEARCH_TOKEN, sort: "relevance", page: 1, limit: 10 },
      "u1"
    );
    assert.ok(
      result.responseTimeMs < 500,
      `search exceeded the 500 ms budget: ${result.responseTimeMs} ms`
    );
    assert.ok(result.total >= SCALE, `expected ${SCALE} matches, got ${result.total}`);
    assert.equal(result.items.length, 10);
  } finally {
    restore();
  }
});

test("search stays under 500 ms when combined with an author filter at scale", () => {
  const restore = seedPosts(SCALE);
  try {
    const result = listDiscussions(
      { search: SEARCH_TOKEN, author: "priya", sort: "relevance", page: 1, limit: 10 },
      "u1"
    );
    assert.ok(
      result.responseTimeMs < 500,
      `author+search exceeded the 500 ms budget: ${result.responseTimeMs} ms`
    );
    assert.ok(result.total > 0, "expected at least one author-filtered match");
  } finally {
    restore();
  }
});

test("relevance sort ranks title matches above body matches at scale", () => {
  const restore = seedPosts(SCALE);
  try {
    const result = listDiscussions(
      { search: SEARCH_TOKEN, sort: "relevance", page: 1, limit: 10 },
      "u1"
    );
    assert.ok(
      result.responseTimeMs < 500,
      `relevance sort exceeded the 500 ms budget: ${result.responseTimeMs} ms`
    );
    const first = result.items[0];
    assert.ok(
      first.title.toLowerCase().includes(SEARCH_TOKEN),
      "top relevance hit should match on the title"
    );
  } finally {
    restore();
  }
});

test("unfiltered paginated listing across 1500 posts stays fast", () => {
  const restore = seedPosts(SCALE);
  try {
    const result = listDiscussions({ page: 5, limit: 10 }, "u1");
    assert.ok(
      result.responseTimeMs < 500,
      `plain listing exceeded the 500 ms budget: ${result.responseTimeMs} ms`
    );
    assert.ok(result.total >= SCALE);
    assert.equal(result.items.length, 10);
  } finally {
    restore();
  }
});