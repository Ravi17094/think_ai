import { useEffect, useState } from 'react';
import { ForumApi } from '../services/forumApi.js';

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

export default function UserProfile({ username }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    ForumApi.getUserByUsername(username)
      .then((found) => {
        if (!active) return null;
        if (!found) {
          throw new Error(`No profile found for "${username}"`);
        }
        setUser(found);
        return ForumApi.getPostsByAuthor(found.id);
      })
      .then((userPosts) => {
        if (!active) return;
        setPosts(userPosts ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? 'Failed to load profile');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Loading profile…</span>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="detail-not-found">
        <h2>Profile not found</h2>
        <p>{error}</p>
        <a className="btn" href="#/">
          Back to the forum
        </a>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <a className="back-link" href="#/">
        ← Back to forum
      </a>

      <section className="profile-card">
        <img className="profile-avatar" src={user.avatar} alt={`${user.displayName} avatar`} width="88" height="88" />
        <div className="profile-info">
          <h1 className="profile-name">{user.displayName}</h1>
          <p className="profile-role">{user.role}</p>
          <p className="profile-handle">@{user.username}</p>
        </div>
        <dl className="profile-stats">
          <div className="profile-stat">
            <dt>Reputation</dt>
            <dd>{user.reputation.toLocaleString()}</dd>
          </div>
          <div className="profile-stat">
            <dt>Posts</dt>
            <dd>{user.postCount}</dd>
          </div>
          <div className="profile-stat">
            <dt>Member since</dt>
            <dd>{new Date(user.joinedAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>

      <section className="profile-posts">
        <h2 className="comments-title">
          {posts.length} {posts.length === 1 ? 'Discussion' : 'Discussions'}
        </h2>

        {posts.length === 0 ? (
          <div className="empty-state">
            <p>This member has not posted any discussions yet.</p>
          </div>
        ) : (
          <ul className="profile-post-list">
            {posts.map((post) => (
              <li key={post.id} className="profile-post">
                <a className="profile-post-title" href={`#/post/${post.id}`}>
                  {post.title}
                </a>
                <div className="profile-post-meta">
                  {post.isSolved && <span className="badge badge-solved">Solved</span>}
                  <span>↑ {post.upvotes}</span>
                  <span>{post.replies} replies</span>
                  <span>{timeAgo(post.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
