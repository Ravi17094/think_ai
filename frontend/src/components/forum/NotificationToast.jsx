import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_AUTO_DISMISS_MS = 5000;

/**
 * Stacked toast notifications (Phase 8).
 *
 * Accepts both `toasts` and `notifications` props (they are aliases) plus
 * `autoDismissMs`/`autoCloseMs` for the auto-dismiss delay. Pass `null` to
 * disable auto-dismissing entirely. Each notification:
 *   { id, message, link?, type? }
 *
 * Supports pause-on-hover: hovering pauses the auto-dismiss timer and
 * resuming restarts it with the full delay.
 */
export default function NotificationToast({
  toasts,
  notifications,
  onDismiss,
  autoDismissMs,
  autoCloseMs,
  onAction,
}) {
  const items = useMemo(() => toasts || notifications || [], [toasts, notifications]);
  const delay =
    autoDismissMs !== undefined ? autoDismissMs : autoCloseMs !== undefined ? autoCloseMs : DEFAULT_AUTO_DISMISS_MS;
  const progressMs =
    !delay ? null : Math.max(Math.min(Number(delay) || 0, 15000), 1500);
  const [pausedIds, setPausedIds] = useState(() => new Set());
  const timersRef = useRef(new Map());

  useEffect(() => {
    if (!delay || !onDismiss) return undefined;

    const timers = timersRef.current;

    const startTimer = (notification) => {
      if (pausedIds.has(notification.id)) return;
      const timer = setTimeout(() => onDismiss(notification.id), delay);
      timers.set(notification.id, timer);
    };

    items.forEach(startTimer);

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [items, delay, onDismiss, pausedIds]);

  const handleMouseEnter = useCallback((id) => {
    setPausedIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      return next;
    });
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const handleMouseLeave = useCallback((id) => {
    setPausedIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="notification-toast-stack" role="status" aria-live="polite">
      {items.map((notification) => (
        <div
          key={notification.id}
          className={`notification-toast${notification.type === "moderation" ? " notification-toast--moderation" : ""}`}
          data-testid="toast"
          data-notification-id={notification.id}
          onMouseEnter={() => handleMouseEnter(notification.id)}
          onMouseLeave={() => handleMouseLeave(notification.id)}
        >
          <span aria-hidden="true">{notification.type === "moderation" ? "🛡" : "🔔"}</span>
          <span className="notification-toast__message">{notification.message}</span>
          <button
            type="button"
            className="notification-toast__action"
            aria-label="Open related live panel"
            onClick={() => onAction && onAction(notification)}
          >
            Open
          </button>
          <button
            type="button"
            className="notification-toast__close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss && onDismiss(notification.id)}
          >
            ✕
          </button>
          {progressMs ? (
            <span
              className="notification-toast__progress"
              style={{ animationDuration: `${progressMs}ms` }}
              aria-hidden="true"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Tiny local toast-list manager shared by pages that only need imperative
 * `pushToast`/`dismissToast` helpers (Phase 5 mentions, Phase 8 actions).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToastList() {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setToasts((previous) => [...previous.slice(-2), { id, message, type }]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, pushToast, dismissToast };
}
