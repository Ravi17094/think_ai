const test = require("node:test");
const assert = require("node:assert/strict");
const { getPreferencesByUserId, upsertPreferences } = require("./services/notificationPreferenceService");

const TEST_USER_ID = 999001;
const TEST_USER_ID_2 = 999002;

test("getPreferencesByUserId returns undefined for a user with no preferences", () => {
  const result = getPreferencesByUserId(TEST_USER_ID);
  assert.equal(result, undefined);
});

test("upsertPreferences creates a new preference with defaults when none provided", () => {
  const pref = upsertPreferences(TEST_USER_ID, {});
  assert.equal(pref.userId, TEST_USER_ID);
  assert.equal(pref.emailEnabled, true);
  assert.equal(pref.smsEnabled, false);
  assert.equal(pref.pushEnabled, true);
  assert.deepEqual(pref.categories, {
    courseUpdates: true,
    forumReplies: true,
    paymentAlerts: true,
    systemAnnouncements: true,
    liveSessions: true,
  });
});

test("upsertPreferences respects explicit overrides on create", () => {
  const pref = upsertPreferences(TEST_USER_ID_2, { emailEnabled: false, smsEnabled: true });
  assert.equal(pref.emailEnabled, false);
  assert.equal(pref.smsEnabled, true);
  assert.equal(pref.pushEnabled, true);
});

test("getPreferencesByUserId returns the created preference", () => {
  const found = getPreferencesByUserId(TEST_USER_ID);
  assert.ok(found);
  assert.equal(found.userId, TEST_USER_ID);
});

test("upsertPreferences updates an existing preference instead of duplicating", () => {
  const updated = upsertPreferences(TEST_USER_ID, { smsEnabled: true });
  assert.equal(updated.smsEnabled, true);
  assert.equal(updated.emailEnabled, true);

  const all = getPreferencesByUserId(TEST_USER_ID);
  assert.equal(all.smsEnabled, true);
});