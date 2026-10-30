import { useEffect, useState, useCallback } from 'react';
import { BookmarkService } from '../services/bookmarkService.js';
import { ForumApi } from '../services/forumApi.js';
import { NotificationService } from '../services/notificationService.js';

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  const units = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'week', seconds: 604800 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 },
  ];
  for (const unit of units) {
    const count = Math.floor(seconds / unit.seconds);
    if (count >= 1) {
      return `${count} ${unit.name}${count === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

export default function BookmarksPage() {
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const bookmarkIds = await BookmarkService.getBookmarks();
      const posts = await Promise.all(
        bookmarkIds.map((id) => ForumApi.getPostById(id).catch(() => null))
      );
      setBookmarkedPosts(posts.filter(Boolean));
    } catch {
      setBookmarkedPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleRemove = async (postId, title) => {
    await BookmarkService.removeBookmark(postId);
    NotificationService.pushNotification({
      type: 'bookmark',
      title: 'Bookmark removed',
      message: `"${title}" was removed from your bookmarks.`,
      postId,
    });
    loadBookmarks();
  };

  return (
    <div className="bookmarks-page">
      <header className="forum-hero">
        <h1 className="forum-title">Bookmarked Posts</h1>
        <p className="forum-subtitle">
          Your saved discussions for quick access.
        </p>
      </header>

      {loading ? (
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading bookmarks&#8230;</span>
        </div>
      ) : bookmarkedPosts.length === 0 ? (
        <div className="empty-state" role="status">
          <svg className="empty-state-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="empty-state-title">No bookmarks yet.</p>
          <p className="empty-state-hint">Bookmark posts from the forum to save them here.</p>
          <a className="btn" href="#/">
            Browse Forum
          </a>
        </div>
      ) : (
        <div className="bookmarks-list">
          {bookmarkedPosts.map((post) => (
            <article key={post.id} className="forum-card">
              <div className="forum-card-content">
                <div className="forum-card-head">
                  {post.isPinned && <span className="badge badge-pinned">Pinned</span>}
                  {post.isSolved && <span className="badge badge-solved">Solved</span>}
                </div>
                <h3 className="forum-card-title">
                  <a href={`#/post/${post.id}`}>{post.title}</a>
                </h3>
                <p className="forum-card-excerpt">{post.content}</p>
                <div className="forum-card-tags">
                  {post.tags.map((tag) => (
                    <a key={tag} className="tag-chip tag-chip-sm" href={`#/tag/${tag}`}>
                      {tag}
                    </a>
                  ))}
                </div>
                <div className="forum-card-footer">
                  <span className="forum-card-meta">
                    <span>{post.views.toLocaleString()} views</span>
                    <span>{post.replies} replies</span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </span>
                  <button
                    className="bookmark-btn is-bookmarked"
                    type="button"
                    onClick={() => handleRemove(post.id, post.title)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5Z" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
