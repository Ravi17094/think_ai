const BOOKMARK_KEY = 'thinkz_bookmarks';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
  } catch {
    // ignore
  }
}

export const BookmarkService = {
  async getBookmarks() {
    await delay(100);
    return loadBookmarks();
  },

  async isBookmarked(postId) {
    await delay(50);
    return loadBookmarks().includes(postId);
  },

  async toggleBookmark(postId) {
    await delay(100);
    const bookmarks = loadBookmarks();
    const index = bookmarks.indexOf(postId);
    let bookmarked;

    if (index >= 0) {
      bookmarks.splice(index, 1);
      bookmarked = false;
    } else {
      bookmarks.push(postId);
      bookmarked = true;
    }

    saveBookmarks(bookmarks);
    return { postId, bookmarked };
  },

  async addBookmark(postId) {
    await delay(100);
    const bookmarks = loadBookmarks();
    if (!bookmarks.includes(postId)) {
      bookmarks.push(postId);
      saveBookmarks(bookmarks);
    }
    return { postId, bookmarked: true };
  },

  async removeBookmark(postId) {
    await delay(100);
    const bookmarks = loadBookmarks();
    const filtered = bookmarks.filter((id) => id !== postId);
    saveBookmarks(filtered);
    return { postId, bookmarked: false };
  },

  async getBookmarkCount() {
    await delay(50);
    return loadBookmarks().length;
  },
};

export function resetBookmarks() {
  try {
    localStorage.removeItem(BOOKMARK_KEY);
  } catch {
    // ignore
  }
}
