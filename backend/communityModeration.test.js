const test = require("node:test");
const assert = require("node:assert/strict");

const contentFilter = require("./src/services/forum/contentFilter");
const moderationPolicy = require("./src/services/forum/moderationPolicy");
const moderatorService = require("./src/services/forum/moderatorService");
const forumConfig = require("./config/forum.config");

test("content filter loads the full 47 client blocked terms from config", () => {
  assert.equal(contentFilter.BLOCKED_TERMS.length, 47);
  assert.equal(contentFilter.TERM_SOURCE.provider, "clientdomain.com");
});

test("content filter detects the client blocked phrase in a post", () => {
  assert.ok(contentFilter.hasBlockedContent("Earn Money Online with this guaranteed link"));
  assert.ok(contentFilter.hasBlockedContent("diploma without exam"));
  assert.equal(contentFilter.hasBlockedContent("How do I learn React?"), false);
});

test("content filter sanitizes control characters and collapses whitespace", () => {
  const sanitized = contentFilter.sanitizeContent(" Hello\u0007  world\t\tagain ");
  assert.equal(sanitized, "Hello world again");
});

test("policy thresholds are configured exactly as the client mandated", () => {
  assert.equal(forumConfig.moderationThresholds.autoFlagReports, 3);
  assert.equal(forumConfig.moderationThresholds.hideReports, 5);
  assert.equal(forumConfig.moderationThresholds.hideWindowMs, 60 * 60 * 1000);
});

test("first report is recorded but does not flag content", () => {
  const before = moderationPolicy.contentStatus("discussion", "d2");
  assert.equal(before.flagged, false);
  const result = moderationPolicy.applyReport({
    contentType: "discussion",
    contentId: "d2",
    reporterUserId: "u1",
    reason: "spam",
  });
  assert.equal(result.action, "recorded");
  assert.equal(result.reportCount, 1);
  assert.equal(result.flagged, false);
});

test("third report auto-flags content for moderator review", () => {
  ["u1", "u2", "u3"].forEach((reporter, i) => {
    const result = moderationPolicy.applyReport({
      contentType: "discussion",
      contentId: "d3",
      reporterUserId: reporter,
      reason: "spam",
    });
    if (i < 2) assert.equal(result.action, "recorded");
    else {
      assert.equal(result.action, "flagged");
      assert.equal(result.flagged, true);
    }
  });
});

test("fifth report within the 1 hour window auto-hides the content", () => {
  let finalResult = null;
  ["u1", "u2", "u3", "u4", "u5"].forEach((reporter) => {
    finalResult = moderationPolicy.applyReport({
      contentType: "discussion",
      contentId: "d4",
      reporterUserId: reporter,
      reason: "spam",
    });
  });
  assert.equal(finalResult.action, "auto-hidden");
  assert.equal(finalResult.hidden, true);
  assert.equal(finalResult.reportCount, 5);
});

test("the same reporter cannot inflate the report count", () => {
  const first = moderationPolicy.applyReport({
    contentType: "comment",
    contentId: "cm-seed-1",
    reporterUserId: "u1",
    reason: "spam",
  });
  const second = moderationPolicy.applyReport({
    contentType: "comment",
    contentId: "cm-seed-1",
    reporterUserId: "u1",
    reason: "spam",
  });
  assert.equal(first.reportCount, 1);
  assert.equal(second.reportCount, 1);
  assert.equal(second.action, "already-reported");
});

test("moderator role carries the four client-mandated permissions", () => {
  const role = moderatorService.roleDefinition();
  assert.equal(role.id, "moderator");
  assert.deepEqual(role.permissions, [
    "forum:read",
    "forum:hide-post",
    "forum:warn-user",
    "forum:view-reports",
  ]);
});

test("the four client community managers are assigned the moderator role", () => {
  const moderators = moderatorService.listModerators();
  const clientEmails = [
    "olivia.bennett@clientdomain.com",
    "marcus.chen@clientdomain.com",
    "sofia.almeida@clientdomain.com",
    "aisha.rahman@clientdomain.com",
  ];
  const emails = moderators.map((m) => m.email);
  clientEmails.forEach((email) => assert.ok(emails.includes(email), `missing ${email}`));
});

test("policy summary exposes the report thresholds without a live dependency", () => {
  const summary = moderationPolicy.policySummary();
  assert.equal(summary.autoFlagReports, 3);
  assert.equal(summary.hideReports, 5);
  assert.equal(summary.hideWindowMs, 3600000);
});