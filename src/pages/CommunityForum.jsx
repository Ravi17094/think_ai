import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ForumApi, getAllUserVotes } from '../services/forumApi.js';
import ForumCard from '../components/ForumCard.jsx';
import TagFilter from '../components/TagFilter.jsx';

function LoadingSpinner() {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>Loading forum posts&#8230;</span>
    </div>
  );
}

export default function CommunityForum({ initialTag = null }) {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [query, setQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [searchMode, setSearchMode] = useState('keyword');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votingId, setVotingId] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    Promise.all([ForumApi.getPosts(), ForumApi.getUsers(), ForumApi.getTags()])
      .then(([postsData, usersData, tagsData]) => {
        if (!mounted.current) return;
        setPosts(postsData);
        setUsers(usersData);
        setTags(tagsData);
        setUserVotes(getAllUserVotes());
      })
      .catch((err) => {
        if (!mounted.current) return;
        setError(err.message ?? 'Failed to load forum data');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => {
      mounted.current = false;
    };
  }, []);

  const userById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const handleVote = useCallback(
    async (postId, direction) => {
      setVotingId(postId);
      setError(null);
      try {
        const updated = await ForumApi.votePost(postId, direction);
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setUserVotes(getAllUserVotes());
      } catch (err) {
        setError(err.message ?? 'Could not record your vote');
      } finally {
        setVotingId(null);
      }
    },
    []
  );

  const handleToggleSolved = useCallback(async (postId) => {
    setVotingId(postId);
    setError(null);
    try {
      const updated = await ForumApi.toggleSolved(postId);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err.message ?? 'Could not update solved status');
    } finally {
      setVotingId(null);
    }
  }, []);

  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const au = authorFilter.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesTag = activeTag === null || post.tags.includes(activeTag);

      let matchesQuery = true;
      if (searchMode === 'keyword' && q.length > 0) {
        matchesQuery =
          post.title.toLowerCase().includes(q) ||
          post.content.toLowerCase().includes(q) ||
          post.tags.some((tag) => tag.toLowerCase().includes(q));
      } else if (searchMode === 'tag' && q.length > 0) {
        matchesQuery = post.tags.some((tag) => tag.toLowerCase().includes(q));
      } else if (searchMode === 'author' && au.length > 0) {
        const author = userById.get(post.authorId);
        matchesQuery =
          !!author &&
          (author.username.toLowerCase().includes(au) ||
            author.displayName.toLowerCase().includes(au));
      }

      return matchesTag && matchesQuery;
    });
  }, [posts, activeTag, query, authorFilter, searchMode, userById]);

  const authorSuggestions = useMemo(() => {
    if (searchMode !== 'author') return [];
    const au = authorFilter.trim().toLowerCase();
    if (au.length === 0) return users.slice(0, 5);
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(au) ||
        u.displayName.toLowerCase().includes(au)
    );
  }, [users, authorFilter, searchMode]);

  const searchLabel =
    searchMode === 'keyword'
      ? 'Search by keyword\u2026'
      : searchMode === 'tag'
        ? 'Search by tag\u2026'
        : 'Search by author name or username\u2026';

  return (
    <div className="forum-page">
      <header className="forum-hero">
        <h1 className="forum-title">Community Forum</h1>
        <p className="forum-subtitle">
          Ask questions, share solutions, and upvote the answers that help.
        </p>
      </header>

      <div className="advanced-search-panel">
        <div className="search-mode-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={searchMode === 'keyword'}
            className={`search-mode-tab ${searchMode === 'keyword' ? 'is-active' : ''}`}
            onClick={() => { setSearchMode('keyword'); setQuery(''); setAuthorFilter(''); }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
            </svg>
            Keyword
          </button>
          <button
            role="tab"
            aria-selected={searchMode === 'tag'}
            className={`search-mode-tab ${searchMode === 'tag' ? 'is-active' : ''}`}
            onClick={() => { setSearchMode('tag'); setQuery(''); setAuthorFilter(''); }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.41l9 9a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.83zM5.5 7A1.5 1.5 0 1 1 7 5.5 1.5 1.5 0 0 1 5.5 7z" />
            </svg>
            Tag
          </button>
          <button
            role="tab"
            aria-selected={searchMode === 'author'}
            className={`search-mode-tab ${searchMode === 'author' ? 'is-active' : ''}`}
            onClick={() => { setSearchMode('author'); setQuery(''); setAuthorFilter(''); }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
            </svg>
            Author
          </button>
        </div>

        <label className="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
          </svg>
          <input
            type="search"
            placeholder={searchLabel}
            value={searchMode === 'author' ? authorFilter : query}
            onChange={(e) => {
              if (searchMode === 'author') setAuthorFilter(e.target.value);
              else setQuery(e.target.value);
            }}
            aria-label={searchLabel}
          />
        </label>

        {searchMode === 'author' && authorSuggestions.length > 0 && authorFilter.length > 0 && (
          <div className="author-suggestions">
            {authorSuggestions.map((u) => (
              <button
                key={u.id}
                type="button"
                className="author-suggestion-item"
                onClick={() => setAuthorFilter(u.username)}
              >
                <img src={u.avatar} alt="" className="author-suggestion-avatar" width="24" height="24" />
                <span className="author-suggestion-name">{u.displayName}</span>
                <span className="author-suggestion-handle">@{u.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <TagFilter tags={tags} activeTag={activeTag} onSelect={setActiveTag} />

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="forum-list-header">
            <span className="forum-count">
              {visiblePosts.length} post{visiblePosts.length === 1 ? '' : 's'}
              {activeTag ? ` tagged \u201c${activeTag}\u201d` : ''}
              {searchMode === 'author' && authorFilter ? ` by \u201c${authorFilter}\u201d` : ''}
            </span>
            <span className="forum-sort">Newest</span>
          </div>

          {visiblePosts.length === 0 ? (
            <div className="empty-state" role="status">
              <svg className="empty-state-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="empty-state-title">
                {activeTag || query || authorFilter
                  ? 'No posts match your filters.'
                  : 'No discussions yet.'}
              </p>
              <p className="empty-state-hint">
                {activeTag || query || authorFilter
                  ? 'Try clearing the tag or search query.'
                  : 'Be the first to start a conversation.'}
              </p>
              {(activeTag || query || authorFilter) && (
                <button
                  className="empty-reset"
                  type="button"
                  onClick={() => {
                    setActiveTag(null);
                    setQuery('');
                    setAuthorFilter('');
                  }}
                >
                  Reset filters
                </button>
              )}
              {!activeTag && !query && !authorFilter && (
                <a className="btn" href="#/new">
                  Ask a Question
                </a>
              )}
            </div>
          ) : (
            <div className="forum-list">
              {visiblePosts.map((post) => (
                <ForumCard
                  key={post.id}
                  post={post}
                  author={userById.get(post.authorId)}
                  voting={votingId === post.id}
                  userVote={userVotes[post.id] || null}
                  onVote={(direction) => handleVote(post.id, direction)}
                  onToggleSolved={() => handleToggleSolved(post.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
