import { forumGet, forumPost, forumPatch, forumPut } from "./forumHttpClient";

/** Moderation API — Phase 8 flagged queue, bans and content visibility. */

export function fetchFlaggedQueue() {
  return forumGet("/moderation/flagged").then((payload) => payload.data);
}

export function fetchModerationUsers() {
  return forumGet("/moderation/users").then((payload) => payload.data);
}

export function banUser(userId) {
  return forumPost(`/moderation/users/${userId}/ban`).then((p) => p.data);
}

export function unbanUser(userId) {
  return forumPost(`/moderation/users/${userId}/unban`).then((p) => p.data);
}

export function warnUser(userId) {
  return forumPost(`/moderation/users/${userId}/warn`).then((p) => p.data);
}

export function muteUser(userId, muted = true) {
  return forumPost(`/moderation/users/${userId}/mute`, { muted }).then((p) => p.data);
}

export function setContentVisibility(id, type, hidden) {
  return forumPatch(`/moderation/content/${id}`, { type, hidden }).then(
    (payload) => payload.data
  );
}

export function resolveContent(id, type) {
  return forumPost(`/moderation/content/${id}/resolve`, { type }).then(
    (payload) => payload.data
  );
}

export function fetchAuditLog() {
  return forumGet("/moderation/audit-log").then((payload) => payload.data);
}

/** Notification endpoints reused by moderation toasts + Phase 9 preferences. */

export function fetchNotifications(userId, { unreadOnly } = {}) {
  return forumGet("/notifications", {
    userId,
    unreadOnly: unreadOnly ? "true" : undefined,
  }).then((payload) => payload.data);
}

export function markNotificationRead(id) {
  return forumPatch(`/notifications/${id}/read`).then((payload) => payload.data);
}

export function fetchNotificationPreferences(userId) {
  return forumGet(`/notifications/preferences/${userId}`).then(
    (payload) => payload.data
  );
}

export function saveNotificationPreferences(userId, prefs) {
  return forumPut(`/notifications/preferences/${userId}`, prefs).then(
    (payload) => payload.data
  );
}

export function markAllNotificationsRead(userId) {
  return forumPost("/notifications/read-all", userId ? { userId } : {}).then(
    (payload) => payload.data
  );
}
