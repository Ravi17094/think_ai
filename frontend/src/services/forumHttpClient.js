/**
 * Backwards-compatible entry point for the Forum HTTP client.
 *
 * The actual implementation lives in forumApi.js so the whole module keeps
 * a single fetch-based transport with zero external dependencies.
 */

export {
  FORUM_API_BASE_URL,
  DEFAULT_USER_ID,
  ForumApiError,
  getCurrentUserId,
  getCurrentUserRole,
  setCurrentUserId,
  forumGet,
  forumPost,
  forumPut,
  forumPatch,
  forumDelete,
} from "./forumApi";
