import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../../styles/forum.css";

import DiscussionList from "../../components/forum/DiscussionList";
import PaginationControls from "../../components/forum/PaginationControls";
import SearchBar from "../../components/forum/SearchBar";
import TagFilter from "../../components/forum/TagFilter";
import { useDiscussions } from "../../hooks/useDiscussions";
import { useVoting } from "../../hooks/useVoting";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useForumSocket } from "../../hooks/useForumSocket";
import { fetchCategories } from "../../services/categoryApi";
import { fetchTags } from "../../services/tagApi";

/**
 * Forum home (Phase 1/2/9): paginated list with server-side search,
 * tag/category/solved filters and sorting.
 */
export default function DiscussionListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    items,
    setItems,
    meta,
    setPage,
    loading,
    error,
    filters,
    applyFilters,
  } = useDiscussions({});

  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        /* filter dropdown simply stays empty */
      });
    fetchTags()
      .then((data) => {
        if (!cancelled) setPopularTags(data.map((tag) => tag.name));
      })
      .catch(() => {
        /* tag filter stays empty if taxonomy endpoint is unreachable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // URL is the single source of truth for search: seed `filters.search` from
  // `?search=` once on mount, then keep the URL param in sync (no reload).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch && urlSearch !== (filters.search || "")) {
      applyFilters({ ...filters, search: urlSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!seededRef.current) return;
    const nextParams = new URLSearchParams(searchParams);
    const current = filters.search || "";
    if (current) nextParams.set("search", current);
    else nextParams.delete("search");
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const { vote, pendingIds } = useVoting();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { subscribe } = useForumSocket();

  // Live list: prepend threads published by anyone while this page is open.
  useEffect(() => {
    const unsubscribe = subscribe("discussion:new", (discussion) => {
      setItems((previous) => {
        if (previous.some((d) => d.id === discussion.id)) return previous;
        return [discussion, ...previous];
      });
    });
    return unsubscribe;
  }, [subscribe, setItems]);

  const patchDiscussion = useCallback(
    (patch) => {
      setItems((previous) =>
        previous.map((discussion) =>
          discussion.id === patch.id ? { ...discussion, ...patch } : discussion
        )
      );
    },
    [setItems]
  );

  const handleVote = useCallback(
    (discussion, direction) => vote(discussion.id, direction, patchDiscussion),
    [vote, patchDiscussion]
  );

  const hasActiveFilters = Boolean(
    filters.search || filters.tag || filters.categoryId || filters.solved
  );

  return (
    <div className="forum-page">
      <div className="forum-container">
        <header className="forum-header">
          <div>
            <h1>Community Forum</h1>
            <p className="forum-subtitle">
              Ask questions, share projects and help others — powered by Thinkz AI.
            </p>
          </div>
          <Link to="/forum/new" className="btn btn--primary">
            + New discussion
          </Link>
        </header>

        <nav className="card-footer" style={{ marginBottom: 14 }} aria-label="Forum sections">
          <Link to="/forum/categories" className="tag-chip">📁 Categories</Link>
          <Link to="/forum/bookmarks" className="tag-chip">🔖 Bookmarks</Link>
          <Link to="/forum/notifications" className="tag-chip">🔔 Notifications</Link>
          <Link to="/forum/studio" className="tag-chip">🎥 Live Studio</Link>
          <Link to="/forum/moderation" className="tag-chip">🛡 Moderation</Link>
          <Link to="/forum/preferences" className="tag-chip">🔔 Preferences</Link>
        </nav>

        <div className="forum-toolbar">
          <SearchBar
            filters={filters}
            onChange={(patch) => applyFilters({ ...filters, ...patch })}
          />
          <select
            className="select"
            aria-label="Filter by category"
            value={filters.categoryId || ""}
            onChange={(event) =>
              applyFilters({ ...filters, categoryId: event.target.value || undefined })
            }
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <TagFilter
          tags={popularTags}
          activeTag={filters.tag}
          onSelect={(tag) => applyFilters({ ...filters, tag: tag || undefined })}
        />

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="loading-note">Loading discussions…</p>
        ) : (
          <>
            <DiscussionList
              discussions={items}
              onVote={handleVote}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              pendingVoteIds={pendingIds}
              emptyTitle={hasActiveFilters ? "No matching discussions" : "No discussions yet"}
              emptyMessage={
                hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Be the first to start a conversation with the community."
              }
              searchTerm={filters.search || ""}
              emptyActionLabel={hasActiveFilters ? "Clear filters" : "Start a discussion"}
              onEmptyAction={hasActiveFilters ? () => applyFilters({}) : () => (window.location.href = "/forum/new")}
            />
            <PaginationControls page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
            <p className="pagination__info" style={{ textAlign: "center", marginTop: 8 }}>
              {meta.total} discussions · page {meta.page} of {meta.totalPages}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
