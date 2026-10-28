import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/moderation.css";

import FlaggedPosts from "../../components/moderation/FlaggedPosts";
import UserModeration from "../../components/moderation/UserModeration";
import ContentModeration from "../../components/moderation/ContentModeration";
import RichTextEditor from "../../components/moderation/RichTextEditor";
import ConfirmDialog from "../../components/moderation/ConfirmDialog";
import NotificationToast from "../../components/forum/NotificationToast";

import {
  banUser,
  fetchFlaggedQueue,
  fetchModerationUsers,
  fetchAuditLog,
  muteUser,
  resolveContent,
  setContentVisibility,
  unbanUser,
  warnUser,
} from "../../services/moderationApi";
import { useForumSocket } from "../../hooks/useForumSocket";

/** Moderation dashboard (Phase 8). */
export default function ModerationDashboardPage() {
  const [flagged, setFlagged] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [editorValue, setEditorValue] = useState(
    "**Notice:** Keep the community friendly.\n- Be kind\n- No spam"
  );

  const pushToast = useCallback((message) => {
    setToasts((previous) => [
      ...previous.slice(-2),
      { id: `mod-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, type: "moderation", message },
    ]);
  }, []);

  const askConfirm = useCallback((config) => setConfirmState(config), []);
  const closeConfirm = useCallback(() => setConfirmState(null), []);

  const markBusy = (key, busy) =>
    setBusyIds((previous) => {
      const next = new Set(previous);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });

  const load = useCallback(() => {
    Promise.all([fetchFlaggedQueue(), fetchModerationUsers(), fetchAuditLog()])
      .then(([queue, userList, audit]) => {
        setFlagged(queue);
        setUsers(userList);
        setAuditEntries(audit);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load moderation data", err);
        setError("Failed to load moderation data");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: any moderation change (this tab or another moderator's tab)
  // refreshes the flagged queue / user list without a full page reload.
  const { subscribe } = useForumSocket();
  useEffect(() => {
    const unsubscribe = subscribe("moderation:update", (payload) => {
      const summary =
        payload && (payload.hidden || payload.banned || payload.resolved)
          ? `Moderation update: ${payload.action} applied`
          : "Moderation update received";
      pushToast(summary);
      load();
    });
    return unsubscribe;
  }, [subscribe, load, pushToast]);

  const runToggleHidden = async (item) => {
    const key = `${item.type}:${item.id}`;
    markBusy(key, true);
    try {
      const result = await setContentVisibility(item.id, item.type, !item.hidden);
      setFlagged((previous) =>
        previous.map((entry) =>
          entry.id === item.id && entry.type === item.type
            ? { ...entry, hidden: result.hidden }
            : entry
        )
      );
      pushToast(`${item.type === "discussion" ? "Discussion" : "Comment"} is now ${result.hidden ? "hidden" : "visible"}`);
      load();
    } catch (err) {
      pushToast(err.message || "Action failed");
    } finally {
      markBusy(key, false);
    }
  };

  const handleToggleHidden = (item) => {
    askConfirm({
      title: item.hidden ? "Show this content?" : "Hide this content?",
      message: item.hidden
        ? "This discussion/comment will become visible to members again."
        : "This discussion/comment will be hidden from the community.",
      confirmLabel: item.hidden ? "Show content" : "Hide content",
      danger: !item.hidden,
      action: () => runToggleHidden(item),
    });
  };

  const runResolve = async (item) => {
    const key = `${item.type}:${item.id}`;
    markBusy(key, true);
    try {
      await resolveContent(item.id, item.type);
      setFlagged((previous) =>
        previous.filter((entry) => !(entry.id === item.id && entry.type === item.type))
      );
      pushToast("Item resolved and removed from the queue");
      load();
    } catch (err) {
      pushToast(err.message || "Could not resolve item");
    } finally {
      markBusy(key, false);
    }
  };

  const handleResolve = (item) => {
    askConfirm({
      title: "Resolve this flagged item?",
      message: "It will be removed from the moderation queue.",
      confirmLabel: "Resolve",
      danger: false,
      action: () => runResolve(item),
    });
  };

  const runToggleVisibilityById = async (type, id) => {
    const key = `${type}:${id}`;
    markBusy(key, true);
    try {
      const known = flagged.find((f) => f.id === id && f.type === type);
      const result = await setContentVisibility(id, type, !(known?.hidden ?? false));
      pushToast(`${type} ${id} is now ${result.hidden ? "hidden" : "visible"}`);
      load();
    } catch (err) {
      pushToast(err.message || `Could not update ${type}`);
    } finally {
      markBusy(key, false);
    }
  };

  const handleToggleVisibilityById = (type, id) => {
    const known = flagged.find((f) => f.id === id && f.type === type);
    const nextHidden = !(known?.hidden ?? false);
    askConfirm({
      title: nextHidden ? "Hide this content?" : "Show this content?",
      message: `${type} ${id} will be ${nextHidden ? "hidden from" : "shown to"} the community.`,
      confirmLabel: nextHidden ? "Hide" : "Show",
      danger: nextHidden,
      action: () => runToggleVisibilityById(type, id),
    });
  };

  const runToggleBan = async (user) => {
    markBusy(user.id, true);
    try {
      const updated = user.banned ? await unbanUser(user.id) : await banUser(user.id);
      setUsers((previous) => previous.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      pushToast(`${updated.name} was ${updated.banned ? "banned" : "unbanned"}`);
      load();
    } catch (err) {
      pushToast(err.message || "Ban action failed");
    } finally {
      markBusy(user.id, false);
    }
  };

  const handleToggleBan = (user) => {
    askConfirm({
      title: user.banned ? "Unban this member?" : "Ban this member?",
      message: user.banned
        ? `${user.name} will regain access to the community.`
        : `${user.name} will be blocked from participating in the community.`,
      confirmLabel: user.banned ? "Unban" : "Ban",
      danger: !user.banned,
      action: () => runToggleBan(user),
    });
  };

  const runWarn = async (user) => {
    markBusy(user.id, true);
    try {
      const updated = await warnUser(user.id);
      setUsers((previous) => previous.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      pushToast(`${updated.name} has been warned`);
      load();
    } catch (err) {
      pushToast(err.message || "Warn action failed");
    } finally {
      markBusy(user.id, false);
    }
  };

  const handleWarn = (user) => {
    askConfirm({
      title: `Warn ${user.name}?`,
      message: `${user.name} will receive a warning notification.`,
      confirmLabel: "Warn",
      danger: false,
      action: () => runWarn(user),
    });
  };

  const runToggleMute = async (user) => {
    markBusy(user.id, true);
    try {
      const updated = await muteUser(user.id, !user.muted);
      setUsers((previous) => previous.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      pushToast(`${updated.name} was ${updated.muted ? "muted" : "unmuted"}`);
      load();
    } catch (err) {
      pushToast(err.message || "Mute action failed");
    } finally {
      markBusy(user.id, false);
    }
  };

  const handleToggleMute = (user) => {
    askConfirm({
      title: user.muted ? `Unmute ${user.name}?` : `Mute ${user.name}?`,
      message: user.muted
        ? `${user.name} will be able to post again.`
        : `${user.name} will be prevented from posting.`,
      confirmLabel: user.muted ? "Unmute" : "Mute",
      danger: !user.muted,
      action: () => runToggleMute(user),
    });
  };

  return (
    <div className="moderation-page">
      <div className="moderation-container">
        <header className="moderation-header">
          <h1>🛡 Moderation Dashboard</h1>
          <Link to="/forum" className="btn btn--ghost btn--small">← Forum</Link>
          <button type="button" className="btn btn--small" onClick={load}>
            Refresh
          </button>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="loading-note">Loading moderation data…</p>
        ) : (
          <div className="moderation-sections">
            <section aria-label="Flagged content">
              <h2 className="section-heading">🚩 Flagged content ({flagged.length})</h2>
              <FlaggedPosts
                items={flagged}
                onToggleHidden={handleToggleHidden}
                onResolve={handleResolve}
                busyIds={busyIds}
              />
              <div style={{ marginTop: 16 }}>
                <ContentModeration
                  onHideToggle={handleToggleVisibilityById}
                  busy={busyIds.size > 0}
                />
              </div>
            </section>

            <aside className="moderation-column" aria-label="Members and tools">
              <UserModeration
                users={users}
                onToggleBan={handleToggleBan}
                onWarn={handleWarn}
                onToggleMute={handleToggleMute}
                busyIds={busyIds}
              />
              <div className="studio-panel moderation-panel">
                <h2>Rich text editor</h2>
                <RichTextEditor value={editorValue} onChange={setEditorValue} placeholder="Write an announcement…" />
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  style={{ marginTop: 10 }}
                  onClick={() => pushToast("Announcement saved (mock)")}
                >
                  Save announcement
                </button>
              </div>
              {auditEntries.length > 0 && (
                <div className="studio-panel moderation-panel">
                  <h2>Audit Log ({auditEntries.length})</h2>
                  <ul className="audit-log-list" style={{ listStyle: "none", padding: 0, maxHeight: 200, overflowY: "auto" }}>
                    {auditEntries.slice(-10).reverse().map((entry) => (
                      <li key={entry.id} style={{ fontSize: "0.78rem", padding: "6px 0", borderBottom: "1px solid var(--forum-border)", color: "var(--forum-text-dim)" }}>
                        <span style={{ color: "var(--forum-text)" }}>{entry.type}</span>
                        {entry.targetUserId && <span> → {entry.targetUserId}</span>}
                        {entry.detail && <span> ({entry.detail})</span>}
                        <span style={{ marginLeft: 6, fontSize: "0.7rem" }}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      <NotificationToast
        notifications={toasts}
        autoCloseMs={4000}
        onDismiss={(id) => setToasts((previous) => previous.filter((t) => t.id !== id))}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onCancel={closeConfirm}
        onConfirm={() => {
          const action = confirmState?.action;
          closeConfirm();
          if (action) action();
        }}
      />
    </div>
  );
}
