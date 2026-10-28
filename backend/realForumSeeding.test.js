const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("./src/data/mockData");
const forumDataService = require("./src/services/forum/forumDataService");
const { listDiscussions } = require("./src/services/discussionService");
const Tag = require("./src/models/Tag");

test("all forum content is loaded from the client-provided files (no mock markers)", () => {
  const report = forumDataService.verifyZeroMockContent({
    discussions: db.discussions,
    comments: db.comments,
  });
  assert.equal(report.ok, true, report.violations.join("; "));
});

test("the seeded forum contains real client threads and comments", () => {
  assert.ok(db.discussions.length >= 8, `expected >= 8 client threads, got ${db.discussions.length}`);
  assert.ok(db.comments.length > 0, "expected seeded client comments");
  const ids = db.discussions.map((d) => d.id);
  ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"].forEach((id) =>
    assert.ok(ids.includes(id), `missing seeded thread ${id}`)
  );
});

test("pinned announcements are present and marked pinned", () => {
  const pinned = db.discussions.filter((d) => d.pinned);
  assert.deepEqual(
    pinned.map((d) => d.id).sort(),
    ["d-ann-ama", "d-ann-guidelines", "d-ann-onboarding"].sort()
  );
});

test("every seeded thread maps to an existing category and author", () => {
  const categoryIds = new Set(db.categories.map((c) => c.id));
  const userIds = new Set(db.users.map((u) => u.id));
  db.discussions.forEach((d) => {
    assert.ok(categoryIds.has(d.categoryId), `thread ${d.id} references missing category ${d.categoryId}`);
    assert.ok(userIds.has(d.authorId), `thread ${d.id} has unresolvable author`);
  });
});

test("seed authors (client community managers) are provisioned as platform users", () => {
  const emails = db.users.map((u) => u.email.toLowerCase());
  assert.ok(emails.includes("olivia.bennett@clientdomain.com"), "expected seed author to be provisioned");
  assert.ok(emails.includes("aisha.rahman@clientdomain.com"), "expected all four community managers");
});

test("client tag taxonomy is fully loaded and filterable", () => {
  const tags = Tag.list();
  assert.ok(tags.length >= 20, `expected the client taxonomy, got ${tags.length}`);
  assert.ok(Tag.findByName("community"), "onboarding tags must exist");
  const names = tags.map((t) => t.name);
  assert.ok(names.includes("ama"));
});

test("bookmarks include client seed bookmarks and the admin onboarding collection", () => {
  const personal = db.bookmarks.filter((b) => b.collection === "personal");
  const onboarding = db.bookmarks.filter((b) => b.collection === "new-user-onboarding");
  assert.ok(personal.length >= 3, "expected the client-provided seed bookmarks");
  assert.ok(onboarding.length >= 4, "expected the admin new-user onboarding bookmarks");
  onboarding.forEach((b) => assert.equal(b.userId, "u8"));
});

test("search over the real seeded content completes well under the 300 ms budget", () => {
  const started = Date.now();
  const result = listDiscussions({ search: "onboarding", page: 1, limit: 10 }, "u1");
  const elapsedMs = Date.now() - started;
  assert.ok(result.responseTimeMs < 300, `exceeded 300 ms budget: ${result.responseTimeMs} ms`);
  assert.ok(elapsedMs < 300, `wall-clock app search exceeded 300 ms: ${elapsedMs} ms`);
  assert.ok(result.total > 0, "expected onboarding matches from the real seed");
});

test("seeding report describes the client source files", () => {
  const report = forumDataService.seedingReport();
  assert.equal(report.threads, 8);
  assert.equal(report.announcements, 3);
  assert.equal(report.moderators, 4);
  assert.ok(report.sourceFiles.some((f) => f.includes("client-forum-seed-prod.json")));
});