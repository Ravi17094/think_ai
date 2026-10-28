/**
 * User moderation table (Phase 8): ban / unban / warn / mute members.
 */
export default function UserModeration({ users = [], onToggleBan, onWarn, onToggleMute, busyIds }) {
  if (users.length === 0) {
    return <p className="loading-note">No users found.</p>;
  }

  return (
    <div className="studio-panel" style={{ overflowX: "auto" }}>
      <h2>Members</h2>
      <table className="moderation-table" data-testid="user-moderation" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ color: "var(--forum-text-dim)", textAlign: "left" }}>
            <th style={{ padding: "6px 8px" }}>User</th>
            <th style={{ padding: "6px 8px" }}>Role</th>
            <th style={{ padding: "6px 8px" }}>Status</th>
            <th style={{ padding: "6px 8px" }} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const busy = busyIds ? busyIds.has(user.id) : false;
            return (
              <tr key={user.id} data-user-id={user.id} style={{ borderTop: "1px solid var(--forum-border)" }}>
                <td style={{ padding: "8px" }}>
                  {user.name}
                  <span style={{ color: "var(--forum-text-dim)" }}> @{user.username}</span>
                </td>
                <td style={{ padding: "8px" }}>{user.role}</td>
                <td style={{ padding: "8px" }}>
                  {user.banned ? (
                    <span style={{ color: "#fda4af" }}>Banned</span>
                  ) : user.warned ? (
                    <span style={{ color: "#fbbf24" }}>Warned</span>
                  ) : user.muted ? (
                    <span style={{ color: "#93a0bf" }}>Muted</span>
                  ) : (
                    <span style={{ color: "#6ee7b7" }}>Active</span>
                  )}
                </td>
                <td style={{ padding: "8px", textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`btn btn--small ${user.banned ? "" : "btn--danger"}`}
                    disabled={busy}
                    onClick={() => onToggleBan(user)}
                  >
                    {user.banned ? "Unban" : "Ban"}
                  </button>
                  {!user.banned && onWarn && (
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      disabled={busy || user.warned}
                      onClick={() => onWarn(user)}
                    >
                      Warn
                    </button>
                  )}
                  {!user.banned && onToggleMute && (
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      disabled={busy}
                      onClick={() => onToggleMute(user)}
                    >
                      {user.muted ? "Unmute" : "Mute"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
