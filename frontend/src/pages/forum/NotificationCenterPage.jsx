import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/forum.css";

import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../../services/moderationApi";
import { getCurrentUserId } from "../../services/forumHttpClient";
import { useForumSocket } from "../../hooks/useForumSocket";
import NotificationToast from "../../components/forum/NotificationToast";
import EmptyState from "../../components/forum/EmptyState";

const NOTIFICATION_ICONS = {
  mention: "💬",
  reply: "💬",
  solved: "✅",
  moderation: "🛡",
  system: "🔔",
  bookmark: "🔖",
  purchase: "💳",
};

function relativeTime(isoDate) {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationCenterPage() {
  const userId = getCurrentUserId();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeToast, setRealtimeToast] = useState([]);

  const pushRealtimeToast = useCallback((notification) => {
    setRealtimeToast((previous) => [
      ...previous.slice(-2),
      { id: `rt-${Date.now()}`, message: notification.message, type: notification.type },
    ]);
  }, []);

  const load = useCallback(() => {
    fetchNotifications(userId)
      .then((data) => {
        setNotifications(data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load notifications");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const { subscribe } = useForumSocket({ userId });

  useEffect(() => {
    const unsubscribe = subscribe("notification:new", (notification) => {
      setNotifications((previous) => [notification, ...previous]);
      pushRealtimeToast(notification);
    });
    return unsubscribe;
  }, [subscribe, pushRealtimeToast]);

  const handleMarkRead = async (notification) => {
    if (notification.read) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((previous) =>
        previous.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    } catch {
      /* best effort */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(userId);
      setNotifications((previous) => previous.map((n) => ({ ...n, read: true })));
    } catch {
      setError("Could not mark all as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="forum-page">
      <div className="forum-container" style={{ maxWidth: 720 }}>
        <header className="forum-header">
          <div>
            <h1>🔔 Notification Center</h1>
            {unreadCount > 0 && (
              <p className="forum-subtitle">{unreadCount} unread notification{unreadCount !== 1 && "s"}</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
            <Link to="/forum" className="btn btn--ghost">← Forum</Link>
          </div>
        </header>

        {error && (
          <div className="error-banner" role="alert">{error}</div>
        )}

        {loading ? (
          <p className="loading-note">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No notifications yet"
            message="When someone mentions you, replies to your thread, or moderates your content, it will show up here."
            actionLabel="Browse discussions"
            onAction={() => (window.location.href = "/forum")}
          />
        ) : (
          <ul className="notification-list" role="list" aria-label="Notifications">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`notification-item ${notification.read ? "" : "notification-item--unread"}`}
              >
                <button
                  type="button"
                  className="notification-item__link"
                  onClick={() => handleMarkRead(notification)}
                  aria-label={notification.read ? notification.message : `Unread: ${notification.message}`}
                >
                  <span className="notification-item__icon" aria-hidden="true">
                    {NOTIFICATION_ICONS[notification.type] || "🔔"}
                  </span>
                  <div className="notification-item__body">
                    <p className="notification-item__message">{notification.message}</p>
                    <time className="notification-item__time" dateTime={notification.createdAt}>
                      {relativeTime(notification.createdAt)}
                    </time>
                  </div>
                  {!notification.read && (
                    <span className="notification-item__dot" aria-hidden="true" />
                  )}
                </button>
                {notification.link && (
                  <Link
                    to={notification.link}
                    className="notification-item__open"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open thread"
                  >
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotificationToast
        notifications={realtimeToast}
        onDismiss={(id) =>
          setRealtimeToast((previous) => previous.filter((t) => t.id !== id))
        }
        autoCloseMs={4000}
      />
    </div>
  );
}
