import { useCallback, useEffect, useRef, useState } from 'react';
import { ForumApi, getUserVote } from '../services/forumApi.js';
import VoteButtons from '../components/VoteButtons.jsx';
import UserProfile from '../components/UserProfile.jsx';

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

export default function DiscussionDetails({ postId }) {
  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setError(null);
    setNotFound(false);
    setBusy(true);

    Promise.all([ForumApi.getPostById(postId), ForumApi.getComments(postId)])
      .then(([postData, commentsData]) => {
        if (!mounted.current) return;
        setPost(postData);
        setComments(commentsData);
        setUserVote(getUserVote(postId));
        return postData.authorId ? ForumApi.getUserById(postData.authorId) : null;
      })
      .then((user) => {
        if (!mounted.current) return;
        setAuthor(user);
      })
      .catch((err) => {
        if (!mounted.current) return;
        setError(err.message ?? 'Failed to load discussion');
      })
      .finally(() => {
        if (mounted.current) setBusy(false);
      });

    return () => {
      mounted.current = false;
    };
  }, [postId]);

  const handleVote = useCallback(
    async (direction) => {
      setBusy(true);
      setError(null);
      try {
        const updated = await ForumApi.votePost(postId, direction);
        setPost(updated);
        setUserVote(getUserVote(postId));
      } catch (err) {
        setError(err.message ?? 'Could not record your vote');
      } finally {
        setBusy(false);
      }
    },
    [postId]
  );

  const handleToggleSolved = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await ForumApi.toggleSolved(postId);
      setPost(updated);
    } catch (err) {
      setError(err.message ?? 'Could not update solved status');
    } finally {
      setBusy(false);
    }
  }, [postId]);

  const handleSubmitComment = useCallback(
    async (e) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const comment = await ForumApi.addComment(postId, {
          authorId: 'u4',
          content: commentText,
        });
        setComments((prev) => [...prev, comment]);
        setCommentText('');
      } catch (err) {
        setError(err.message ?? 'Could not add your comment');
      } finally {
        setBusy(false);
      }
    },
    [postId, commentText]
  );

  if (busy && !post) {
    return (
      <div className="loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Loading discussion…</span>
      </div>
    );
  }

  if (!busy && error && !post) {
    return (
      <div className="detail-not-found">
        <h2>Discussion not found</h2>
        <p>{error}</p>
        <a className="btn" href="#/">
          Back to the forum
        </a>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="detail-page">
      <a className="back-link" href="#/">
        ← Back to forum
      </a>

      <article className="detail-card">
        <div className="detail-head">
          {post.isPinned && <span className="badge badge-pinned">Pinned</span>}
          {post.isSolved && (
            <span className="badge badge-solved">✓ Solved</span>
          )}
        </div>

        <h1 className="detail-title">{post.title}</h1>

        <div className="detail-meta">
          <UserProfile user={author} />
          <span className="detail-stats">
            <span>{post.views.toLocaleString()} views</span>
            <span>{post.replies} replies</span>
            <span>{timeAgo(post.createdAt)}</span>
          </span>
        </div>

        <div className="detail-tags">
          {post.tags.map((tag) => (
            <a key={tag} className="tag-chip" href={`#/tag/${encodeURIComponent(tag)}`}>
              {tag}
            </a>
          ))}
        </div>

        <div className="detail-content">
          {post.content}
        </div>

        <div className="detail-actions">
          <VoteButtons
            upvotes={post.upvotes}
            downvotes={post.downvotes}
            onVote={handleVote}
            disabled={busy}
            userVote={userVote}
          />
          <button
            className={post.isSolved ? 'solve-btn is-solved' : 'solve-btn'}
            type="button"
            disabled={busy}
            onClick={handleToggleSolved}
          >
            {post.isSolved ? 'Mark as Unsolved' : 'Mark as Solved'}
          </button>
        </div>
      </article>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <section className="comments-section">
        <h2 className="comments-title">
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>

        {comments.length === 0 ? (
          <div className="empty-state" role="status">
            <svg className="empty-state-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="empty-state-title">No comments yet.</p>
            <p className="empty-state-hint">Be the first to share your thoughts below.</p>
          </div>
        ) : (
          <ul className="comments-list">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </ul>
        )}

        <form className="comment-form" onSubmit={handleSubmitComment}>
          <h3 className="comment-form-title">Add a comment</h3>
          <textarea
            className="comment-input"
            rows="4"
            placeholder="Share your answer or follow-up question…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={busy || !commentText.trim()}>
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      </section>
    </div>
  );
}

function CommentItem({ comment }) {
  const [commentAuthor, setCommentAuthor] = useState(null);

  useEffect(() => {
    let active = true;
    ForumApi.getUserById(comment.authorId).then((user) => {
      if (active) setCommentAuthor(user);
    });
    return () => {
      active = false;
    };
  }, [comment.authorId]);

  return (
    <li className="comment-item">
      <div className="comment-body">
        <UserProfile user={commentAuthor} />
        <p className="comment-text">{comment.content}</p>
        <div className="comment-footer">
          <span>{timeAgo(comment.createdAt)}</span>
          {comment.upvotes > 0 && (
            <span>↑ {comment.upvotes}</span>
          )}
        </div>
      </div>
    </li>
  );
}
