import { forumGet } from "./forumHttpClient";

/**
 * Tag taxonomy API — served from the client tag taxonomy
 * (GET /api/tags) instead of a hard-coded frontend list.
 */
export function fetchTags() {
  return forumGet("/tags").then((payload) => payload.data);
}