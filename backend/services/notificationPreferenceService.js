const { notificationPreferences } = require("../data/notificationPreferences");
const NotificationPreference = require("../models/NotificationPreference");
const { enqueue } = require("./notificationQueueService");

function getPreferencesByUserId(userId) {
  return notificationPreferences.find((p) => p.userId === userId);
}

function upsertPreferences(userId, updates) {
  const existingIndex = notificationPreferences.findIndex(
    (p) => p.userId === userId
  );

  const now = new Date().toISOString();

  if (existingIndex === -1) {
    const newPref = new NotificationPreference({
      userId,
      emailEnabled: updates.emailEnabled ?? true,
      smsEnabled: updates.smsEnabled ?? false,
      pushEnabled: updates.pushEnabled ?? true,
      categories: updates.categories ?? {
        courseUpdates: true,
        forumReplies: true,
        paymentAlerts: true,
        systemAnnouncements: true,
        liveSessions: true,
      },
      updatedAt: now,
    });
    notificationPreferences.push(newPref);
    enqueue({ type: "preferences_updated", userId});
    return newPref;
  }

  const existing = notificationPreferences[existingIndex];
  const updated = {
    ...existing,
    ...updates,
    userId,
    updatedAt: now,
  };
  notificationPreferences[existingIndex] = updated;
  enqueue({ type: "preferences_updated", userId});
  return updated;
}

module.exports = { getPreferencesByUserId, upsertPreferences };