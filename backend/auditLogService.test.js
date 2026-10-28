const test = require("node:test");
const assert = require("node:assert/strict");
const { logAccessDenied, logRoleChange, getEntries, toCSV, toJSON } = require("./services/auditLogService");

test("logRoleChange creates an entry with expected fields", () => {
  const entry = logRoleChange({
    actorRole: "Admin",
    targetUserId: 1,
    targetUserName: "Ravi Kumar",
    oldRole: "Learner",
    newRole: "TA",
  });
  assert.equal(entry.action, "ROLE_CHANGE");
  assert.equal(entry.actorRole, "Admin");
  assert.equal(entry.oldRole, "Learner");
  assert.equal(entry.newRole, "TA");
  assert.ok(entry.id);
  assert.ok(entry.timestamp);
});

test("getEntries filters by role (matches actorRole or newRole)", () => {
  logRoleChange({ actorRole: "Admin", targetUserId: 2, targetUserName: "Test2", oldRole: "Learner", newRole: "Instructor" });
  const results = getEntries({ role: "Instructor" });
  assert.ok(results.every(e => e.actorRole === "Instructor" || e.newRole === "Instructor"));
  assert.ok(results.length >= 1);
});

test("getEntries filters by action", () => {
  const results = getEntries({ action: "ROLE_CHANGE" });
  assert.ok(results.every(e => e.action === "ROLE_CHANGE"));
  assert.ok(results.length >= 1);
});

test("logAccessDenied records the rejected route and required roles", () => {
  const entry = logAccessDenied({
    actorRole: "TA",
    targetUserId: "ta-1",
    route: "/api/admin/users",
    requiredRoles: ["Admin"],
  });
  assert.equal(entry.action, "ACCESS_DENIED");
  assert.equal(entry.targetUserName, "/api/admin/users");
  assert.equal(entry.newRole, "Required: Admin");
});

test("getEntries with no filters returns all entries", () => {
  const all = getEntries();
  assert.ok(all.length >= 2);
});

test("toJSON returns valid parseable JSON", () => {
  const entries = getEntries();
  const json = toJSON(entries);
  const parsed = JSON.parse(json);
  assert.equal(parsed.length, entries.length);
});

test("toCSV returns header row plus one row per entry", () => {
  const entries = getEntries();
  const csv = toCSV(entries);
  const lines = csv.split("\n");
  assert.equal(lines[0], "id,timestamp,actorRole,action,targetUserId,targetUserName,oldRole,newRole");
  assert.equal(lines.length, entries.length + 1);
});
