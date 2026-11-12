/** Backend-backed forum bookmarks. Browser storage is not used. */
const API_BASE = (import.meta.env.VITE_COMMUNITY_API_URL || '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Bookmark request failed (${response.status})`);
  return payload.data;
}

async function ids() {
  return (await request('/bookmarks')).map((record) => record.discussionId);
}

export const BookmarkService = {
  getBookmarks: ids,
  async isBookmarked(postId) { return (await ids()).includes(postId); },
  async toggleBookmark(postId) {
    if (await this.isBookmarked(postId)) return this.removeBookmark(postId);
    return this.addBookmark(postId);
  },
  async addBookmark(postId) {
    await request('/bookmarks', { method: 'POST', body: JSON.stringify({ discussionId: postId }) });
    return { postId, bookmarked: true };
  },
  async removeBookmark(postId) {
    // Demo community identity is resolved as u1 by the backend when no token is present.
    await request(`/bookmarks/u1/${encodeURIComponent(postId)}`, { method: 'DELETE' });
    return { postId, bookmarked: false };
  },
  async getBookmarkCount() { return (await ids()).length; },
};

export function resetBookmarks() {}
