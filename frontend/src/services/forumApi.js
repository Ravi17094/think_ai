/**
 * Self-contained HTTP client + discussion/comment/notification API for the
 * Forum module (Phases 1/2/5/9).
 *
 * The Forum deliberately avoids the shared apiClient used by other Thinkz AI
 * modules so it can be developed, tested and deployed independently.
 */

export const FORUM_API_BASE_URL =
  import.meta.env.VITE_FORUM_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "/api";

const CURRENT_USER_KEY = "thinkz_forum_user_id";

/** Demo identity used by the mock auth middleware on the backend. */
export const DEFAULT_USER_ID = "u1";

/** Demo role used when no real JWT is stored (mirrors the backend mock auth). */
const DEFAULT_DEMO_ROLE = "Instructor";

/**
 * Builds the auth headers expected by the shared backend middleware
 * (`authenticateToken` / `requireRole`): a Bearer JWT when one is stored,
 * otherwise the mock/demo headers (`x-demo-role` / `x-demo-user-id`).
 */
function buildAuthHeaders() {
  let token = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    /* storage unavailable (private mode / tests) */
  }

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {
    "x-demo-role": DEFAULT_DEMO_ROLE,
    "x-demo-user-id": getCurrentUserId(),
  };
}

/** Current forum identity, resolved lazily from localStorage. */
export function getCurrentUser() {
  return { id: getCurrentUserId(), name: "You" };
}

/** Convenience constant for pages that need a stable identity object. */
export const CURRENT_USER = getCurrentUser();

export function getCurrentUserId() {
  try {
    return localStorage.getItem(CURRENT_USER_KEY) || DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

export function setCurrentUserId(userId) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, userId);
  } catch {
    /* storage unavailable (private mode / tests) — keep default user */
  }
}

export class ForumApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = "ForumApiError";
    this.status = status;
    this.errors = errors || null;
  }
}

async function request(path, { method = "GET", body, query } = {}) {
  let url = `${FORUM_API_BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": getCurrentUserId(),
        ...buildAuthHeaders(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ForumApiError("Network error — is the backend running?", 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    throw new ForumApiError(
      (payload && payload.message) || `Request failed (${response.status})`,
      response.status,
      payload && payload.errors
    );
  }
  return payload;
}

export function forumGet(path, query) {
  return request(path, { method: "GET", query });
}

export function forumPost(path, body) {
  return request(path, { method: "POST", body });
}

export function forumPut(path, body) {
  return request(path, { method: "PUT", body });
}

export function forumPatch(path, body) {
  return request(path, { method: "PATCH", body });
}

export function forumDelete(path) {
  return request(path, { method: "DELETE" });
}

/* ===================== Discussions (Phase 1/2/9) ===================== */

export function fetchDiscussions(filters = {}) {
  return forumGet("/discussions", filters).then((payload) => payload.data);
}

export function fetchDiscussionById(id) {
  return forumGet(`/discussions/${id}`).then((payload) => payload.data);
}

export function createDiscussion({ title, body, tags, categoryId }) {
  return forumPost("/discussions", { title, body, tags, categoryId }).then(
    (payload) => payload.data
  );
}

export function voteDiscussion(id, direction) {
  return forumPost(`/discussions/${id}/vote`, { direction }).then(
    (payload) => payload.data
  );
}

export function setDiscussionSolved(id, solved) {
  return forumPatch(`/discussions/${id}/solved`, { solved }).then(
    (payload) => payload.data
  );
}

export function flagDiscussion(id, reason) {
  return forumPost(`/discussions/${id}/flag`, { reason }).then(
    (payload) => payload.data
  );
}

/* ========================= Comments (Phase 2) ======================== */

export function fetchComments(discussionId) {
  return forumGet(`/comments/${discussionId}`).then((payload) => payload.data);
}

/**
 * Posts a comment. The API returns the serialized comment plus
 * `notificationsCreated` so the UI can toast about mention notifications.
 */
export async function postComment(discussionId, body, parentId = null) {
  const payload = await forumPost("/comments", { discussionId, body, parentId });
  return { ...payload.data, comment: payload.data };
}

/* ============== Notification preferences (Phase 8/9) ================ */

export function getPreferences(userId = getCurrentUserId()) {
  return forumGet(`/notifications/preferences/${userId}`);
}

export function savePreferences(preferences, userId = getCurrentUserId()) {
  return forumPut(`/notifications/preferences/${userId}`, preferences);
}

/**
 * Namespaced client bundle — mirrors how other Thinkz AI services expose
 * their API surface (`api.discussions.list()` style consumers, tests).
 */
export const forumApi = {
  fetchDiscussions,
  fetchDiscussionById,
  createDiscussion,
  voteDiscussion,
  setDiscussionSolved,
  flagDiscussion,
  fetchComments,
  postComment,
  getPreferences,
  savePreferences,
};
