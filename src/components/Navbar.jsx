import { useEffect, useState } from 'react';
import { NotificationService } from '../services/notificationService.js';

export default function Navbar() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsState, setWsState] = useState('disconnected');
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    NotificationService.connect();

    const unsub = NotificationService.subscribe((notifs, event) => {
      if (event) {
        if (event.type === 'statechange') {
          setWsState(event.state);
        }
        return;
      }
      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      }
    });

    NotificationService.getNotifications().then((notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });

    return () => {
      unsub();
      NotificationService.disconnect();
    };
  }, []);

  const handleMarkAllRead = async () => {
    await NotificationService.markAllAsRead();
    setUnreadCount(0);
  };

  const handleClearAll = async () => {
    await NotificationService.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a className="navbar-brand" href="#/">
          <svg
            className="navbar-logo"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.8 3.8L12 11.9 5.2 8.1 12 4.3ZM5 9.7l6 3.4v6.6l-6-3.3V9.7Zm14 0v6.7l-6 3.3v-6.6l6-3.4Z" />
          </svg>
          <span>Thinkz Community</span>
        </a>

        <nav className="navbar-links" aria-label="Primary">
          <a className="navbar-link" href="#/">
            Forum
          </a>
          <a className="navbar-link" href="#/bookmarks">
            Bookmarks
          </a>
          <a className="navbar-link" href="#/assessment">
            Assessment
          </a>
        </nav>

        <div className="navbar-notif-wrapper">
          <button
            className="navbar-notif-btn"
            type="button"
            onClick={() => setShowNotifs((prev) => !prev)}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z" />
            </svg>
            {unreadCount > 0 && (
              <span className="navbar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifs && (
            <div className="navbar-notif-dropdown" role="menu">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">Notifications</span>
                <span className={`notif-ws-state notif-ws-${wsState}`}>
                  {wsState === 'connected' ? '● Live' : wsState === 'connecting' ? '○ Connecting…' : '○ Offline'}
                </span>
              </div>
              <div className="notif-dropdown-actions">
                <button type="button" onClick={handleMarkAllRead}>Mark all read</button>
                <button type="button" onClick={handleClearAll}>Clear all</button>
              </div>
              {notifications.length === 0 ? (
                <p className="notif-dropdown-empty">No notifications yet.</p>
              ) : (
                <ul className="notif-dropdown-list">
                  {notifications.slice(0, 10).map((n) => (
                    <li
                      key={n.id}
                      className={`notif-item ${n.read ? '' : 'notif-unread'}`}
                    >
                      <div className="notif-item-content">
                        <span className="notif-item-title">{n.title}</span>
                        <span className="notif-item-msg">{n.message}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <a className="navbar-cta" href="#/new">
          Ask Question
        </a>
      </div>
    </header>
  );
}
