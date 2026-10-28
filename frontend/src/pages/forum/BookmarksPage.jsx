import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/forum.css";

import DiscussionList from "../../components/forum/DiscussionList";
import EmptyState from "../../components/forum/EmptyState";
import { fetchBookmarks, removeBookmark } from "../../services/bookmarkApi";
import { useForumSocket } from "../../hooks/useForumSocket";

/** Bookmarked discussions page (Phase 5/9) with mock API sync. */
export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchBookmarks()
      .then((data) => {
        if (!cancelled) setBookmarks(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load bookmarks");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time: keep local bookmark state in sync when a bookmark changes for
  // this user in another tab (added or removed).
  const { subscribe } = useForumSocket();
  useEffect(() => {
    const unsubscribe = subscribe("bookmark:changed", (payload) => {
      if (!payload || payload.bookmarked === undefined) return;
      fetchBookmarks()
        .then((data) => setBookmarks(data))
        .catch(() => {
          /* ignore transient sync errors */
        });
    });
    return unsubscribe;
  }, [subscribe]);

  const handleRemove = async (discussionId) => {
    const removedBookmark = bookmarks.find((b) => b.discussionId === discussionId);
    setBookmarks((previous) => previous.filter((b) => b.discussionId !== discussionId));
    try {
      await removeBookmark(removedBookmark?.userId, discussionId);
    } catch {
      if (removedBookmark) {
        setBookmarks((previous) => [...previous, removedBookmark].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
      setError("Could not remove bookmark — restored");
    }
  };

  return (
    <div className="forum-page">
      <div className="forum-container">
        <header className="forum-header">
          <h1>🔖 Bookmarks</h1>
          <Link to="/forum" className="btn btn--ghost">← Forum</Link>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="loading-note">Loading bookmarks…</p>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            icon="🔖"
            title="No bookmarks yet"
            message="Bookmark discussions to find them quickly later."
            actionLabel="Browse discussions"
            onAction={() => window.history.back()}
          />
        ) : (
          <DiscussionList
            discussions={bookmarks.map((bookmark) => ({
              ...bookmark.discussion,
              userVote: bookmark.discussion.userVote,
            }))}
            isBookmarked={() => true}
            onToggleBookmark={handleRemove}
            emptyTitle="No bookmarks yet"
            emptyMessage="Bookmark discussions to find them quickly later."
          />
        )}
      </div>
    </div>
  );
}
