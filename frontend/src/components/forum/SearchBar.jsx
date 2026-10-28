import { useState } from "react";

const DEFAULT_FILTERS = {
  search: "",
  tag: "",
  author: "",
  solved: "",
  dateFrom: "",
  dateTo: "",
  sort: "recent",
};

/**
 * Forum search + filter panel (Phase 9). Emits partial filter patches
 * through `onChange` so the page can merge them into its own state:
 *   onChange({ search }) · onChange({ author }) · onChange({ sort }) …
 * The Clear button emits a full reset object.
 */
export default function SearchBar({ filters = {}, onChange }) {
  const [searchDraft, setSearchDraft] = useState(filters.search || "");
  const [authorDraft, setAuthorDraft] = useState(filters.author || "");

  const patch = (partial) => onChange && onChange(partial);

  const submitSearch = (event) => {
    event.preventDefault();
    patch({ search: searchDraft.trim() });
  };

  const handleAuthorBlur = () => {
    const normalized = authorDraft.trim().replace(/^@+/, "");
    if (authorDraft !== normalized) setAuthorDraft(normalized);
    patch({ author: normalized });
  };

  const handleDateFromChange = (event) => {
    const from = event.target.value;
    const to = filters.dateTo || "";
    if (from && to && from > to) {
      patch({ dateFrom: from, dateTo: "" });
    } else {
      patch({ dateFrom: from });
    }
  };

  const handleDateToChange = (event) => {
    const to = event.target.value;
    const from = filters.dateFrom || "";
    if (from && to && to < from) {
      patch({ dateTo: to, dateFrom: "" });
    } else {
      patch({ dateTo: to });
    }
  };

  return (
    <form className="search-bar" role="search" onSubmit={submitSearch}>
      <div className="search-bar__row">
        <input
          id="forum-search"
          type="text"
          className="input"
          value={searchDraft}
          placeholder="Search discussions…"
          aria-label="Search discussions"
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <button type="submit" className="btn btn--primary btn--small">
          Search
        </button>
      </div>

      <div className="search-bar__row search-bar__row--filters">
        <select
          className="select"
          aria-label="Solved status filter"
          value={filters.solved ?? ""}
          onChange={(event) => patch({ solved: event.target.value })}
        >
          <option value="">All threads</option>
          <option value="true">Solved</option>
          <option value="false">Unsolved</option>
        </select>

        <select
          className="select"
          aria-label="Sort order"
          value={filters.sort ?? "recent"}
          onChange={(event) => patch({ sort: event.target.value })}
        >
          <option value="recent">Newest</option>
          <option value="relevance">Relevance</option>
          <option value="votes">Most voted</option>
          <option value="views">Most viewed</option>
          <option value="title">Title A–Z</option>
        </select>

        <input
          id="forum-author-filter"
          type="text"
          className="input"
          value={authorDraft}
          placeholder="@author"
          aria-label="Filter by author"
          onChange={(event) => setAuthorDraft(event.target.value)}
          onBlur={handleAuthorBlur}
        />

        <input
          id="forum-date-from"
          type="date"
          className="input"
          value={filters.dateFrom ?? ""}
          aria-label="Date from"
          onChange={handleDateFromChange}
        />
        <input
          id="forum-date-to"
          type="date"
          className="input"
          value={filters.dateTo ?? ""}
          aria-label="Date to"
          onChange={handleDateToChange}
        />

        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => {
            setSearchDraft("");
            setAuthorDraft("");
            patch({ ...DEFAULT_FILTERS });
          }}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
