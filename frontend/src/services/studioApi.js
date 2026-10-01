import { forumGet, forumPost, forumPatch, forumDelete } from "./forumHttpClient";

/**
 * Live Class Studio API client.
 *
 * All endpoints are backed by the DB-backed `/api/studio` routes on the
 * Thinkz backend (sessions, attendees, messages, polls and breakout rooms
 * persisted to PostgreSQL). Each function unwraps the API envelope and the
 * authenticated user is derived from the `x-user-id` header on fetch.
 */

export function fetchStudioSession(sessionId) {
  return forumGet(`/studio/sessions/${sessionId}`).then((payload) => payload.data);
}

export function joinStudioSession(sessionId) {
  return forumPost(`/studio/sessions/${sessionId}/join`).then((payload) => payload.data);
}

export function updateStudioSessionStatus(sessionId, status, scheduledAt) {
  return forumPatch(`/studio/sessions/${sessionId}/status`, { status, scheduledAt }).then(
    (payload) => payload.data
  );
}

export function fetchStudioMessages(sessionId) {
  return forumGet(`/studio/sessions/${sessionId}/messages`).then((payload) => payload.data);
}

export function sendStudioMessage(sessionId, text) {
  return forumPost(`/studio/sessions/${sessionId}/messages`, { text }).then(
    (payload) => payload.data
  );
}

export function createStudioPoll(sessionId, { question, options }) {
  return forumPost(`/studio/sessions/${sessionId}/polls`, { question, options }).then(
    (payload) => payload.data
  );
}

export function voteStudioPoll(pollId, optionId) {
  return forumPost(`/studio/polls/${pollId}/vote`, { optionId }).then(
    (payload) => payload.data
  );
}

export function fetchBreakoutRooms(sessionId) {
  return forumGet(`/studio/sessions/${sessionId}/breakouts`).then((payload) => payload.data);
}

export function createBreakoutRoom(sessionId, name) {
  return forumPost(`/studio/sessions/${sessionId}/breakouts`, { name }).then(
    (payload) => payload.data
  );
}

export function joinBreakoutRoom(roomId) {
  return forumPost(`/studio/breakouts/${roomId}/join`).then((payload) => payload.data);
}

export function leaveBreakoutRoom(roomId) {
  return forumDelete(`/studio/breakouts/${roomId}/leave`).then(() => ({ joined: false }));
}
