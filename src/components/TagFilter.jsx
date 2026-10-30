import { useMemo, useState } from 'react';

export default function TagFilter({ tags, activeTag, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => a.localeCompare(b)),
    [tags]
  );

  return (
    <section className="tag-filter" aria-label="Filter posts by tag">
      <div className="tag-filter-header">
        <h2 className="tag-filter-title">Filter by Tag</h2>
        <button
          className="tag-filter-toggle"
          type="button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      <div className={collapsed ? 'tag-chip-list is-collapsed' : 'tag-chip-list'}>
        <button
          className={activeTag === null ? 'tag-chip is-active' : 'tag-chip'}
          type="button"
          onClick={() => onSelect(null)}
        >
          All Tags
        </button>
        {sortedTags.map((tag) => (
          <button
            key={tag}
            className={activeTag === tag ? 'tag-chip is-active' : 'tag-chip'}
            type="button"
            onClick={() => onSelect(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}
