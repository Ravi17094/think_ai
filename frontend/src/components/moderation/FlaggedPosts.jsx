/**
 * Flagged posts queue (Phase 8): discussions + comments awaiting review
 * with hide/show and resolve actions.
 */
export default function FlaggedPosts({ items = [], onToggleHidden, onResolve, busyIds }) {
  if (items.length === 0) {
    return <p className="loading-note">🎉 Queue is clear — no flagged content.</p>;
  }

  return (
    <div className="flagged-list">
      {items.map((item) => {
        const busy = busyIds ? busyIds.has(`${item.type}:${item.id}`) : false;
        return (
          <article key={`${item.type}-${item.id}`} className="comment" data-flagged-id={item.id}>
            <div className="comment__meta">
              <span className="badge badge--pinned">{item.type}</span>
              <span>{item.authorName}</span>
              {item.reporterName && (
                <span>
                  <span aria-hidden="true">· flagged by </span>
                  <span className="flag-reporter">{item.reporterName}</span>
                </span>
              )}
              {item.flaggedAt && (
                <span className="flag-time" title={item.flaggedAt}>
                  {new Date(item.flaggedAt).toLocaleString()}
                </span>
              )}
              {item.reason && (
                <span style={{ color: "#fda4af" }}>
                  <span aria-hidden="true">· reason: </span>
                  <span className="flag-reason">{item.reason}</span>
                </span>
              )}
              {item.hidden && <span className="badge badge--solved">hidden</span>}
            </div>
            <p className="comment__body">{item.excerpt}</p>

            <div className="card-footer" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn btn--small"
                disabled={busy}
                onClick={() => onToggleHidden(item)}
              >
                {item.hidden ? "Show content" : "Hide content"}
              </button>
              <button
                type="button"
                className="btn btn--small btn--primary"
                disabled={busy}
                onClick={() => onResolve(item)}
              >
                Resolve
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
