import { forumGet, forumPost, forumPatch, forumDelete } from "./forumHttpClient";

/**
 * Live Class Studio API client.
 *
 * All endpoints are backed by the DB-backed `/api/live-studio` routes on the
 * Thinkz backend (sessions, attendees, messages, polls and breakout rooms
 * persisted to PostgreSQL). Each function unwraps the API envelope and the
 * authenticated user is derived from the `x-user-id` header on fetch.
 */

export function fetchStudioSession(sessionId) {
  return forumGet(`/live-studio/sessions/${sessionId}`).then((payload) => payload.data);
}

export function joinStudioSession(sessionId) {
  return forumPost(`/live-studio/sessions/${sessionId}/join`).then((payload) => payload.data);
}

export function updateStudioSessionStatus(sessionId, status, scheduledAt) {
  return forumPatch(`/studio/sessions/${sessionId}/status`, { status, scheduledAt }).then(
    (payload) => payload.data
  );
}

export function fetchStudioMessages(sessionId) {
  return forumGet(`/live-studio/sessions/${sessionId}/messages`).then((payload) => payload.data);
}

export function sendStudioMessage(sessionId, text) {
  return forumPost(`/live-studio/sessions/${sessionId}/messages`, { text }).then(
    (payload) => payload.data
  );
}

export function createStudioPoll(sessionId, { question, options }) {
  return forumPost(`/live-studio/sessions/${sessionId}/polls`, { question, options }).then(
    (payload) => payload.data
  );
}

export function voteStudioPoll(pollId, optionId) {
  return forumPost(`/live-studio/polls/${pollId}/vote`, { optionId }).then(
    (payload) => payload.data
  );
}

export function fetchBreakoutRooms(sessionId) {
  return forumGet(`/live-studio/sessions/${sessionId}/breakouts`).then((payload) => payload.data);
}

export function createBreakoutRoom(sessionId, name) {
  return forumPost(`/live-studio/sessions/${sessionId}/breakouts`, { name }).then(
    (payload) => payload.data
  );
}

export function joinBreakoutRoom(roomId) {
  return forumPost(`/live-studio/breakouts/${roomId}/join`).then((payload) => payload.data);
}

export function leaveBreakoutRoom(roomId) {
  return forumDelete(`/live-studio/breakouts/${roomId}/leave`).then(() => ({ joined: false }));
}
