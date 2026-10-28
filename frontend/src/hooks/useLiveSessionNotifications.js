import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  showToast,
  notificationReceived,
} from '../features/preferenceNotification/preferenceNotificationSlice';

/**
 * Live Session Notification Center.
 *
 * Subscribes to the real-time session lifecycle on the main Socket.IO
 * namespace:
 *   - `session:started` -> "Live class starting now" toast + join link
 *   - `session:ended`   -> "Recording available" toast + summary link
 *
 * Preference gating (opt out): when the user's notification preferences have
 * `categories.liveSessions === false`, events are dropped client-side and no
 * toast/notification is created. The backend enforces the same rule before it
 * ever emits to the socket.
 *
 * Each browser tab opens its own socket, so a single session event reaches
 * every open tab in real time (two-tab verification).
 */

export const LIVE_SESSION_EVENTS = {
  STARTED: 'session:started',
  ENDED: 'session:ended',
};

export const LIVE_SESSION_TYPES = {
  START: 'live-start',
  END: 'live-end',
};

const SOCKET_URL = 'http://localhost:5000';

/**
 * Pure mapper: live-session socket payload -> Redux toast shape.
 * Returns null for payloads that are not live-session notifications (e.g.
 * the session-management object emitted to the requesting socket).
 */
export function buildLiveSessionToast(eventName, payload) {
  const type = payload?.type;
  const title = payload?.title || 'Live class';

  if (type === LIVE_SESSION_TYPES.START) {
    return {
      title,
      message: payload.message || `Live class starting now — ${title}`,
      link: payload.link || null,
      linkLabel: payload.linkLabel || 'Join live class',
      type: 'success',
    };
  }

  if (type === LIVE_SESSION_TYPES.END) {
    return {
      title,
      message: payload.message || `Recording available — ${title}`,
      link: payload.link || null,
      linkLabel: payload.linkLabel || 'View summary & recording',
      type: 'info',
    };
  }

  return null;
}

/**
 * Whether the user has opted out of live-session notifications.
 * Missing preferences = enabled (default on).
 */
export function isLiveSessionOptedOut(preferences) {
  if (!preferences) return false;
  if (preferences.pushEnabled === false) return true;
  return preferences.categories?.liveSessions === false;
}

function defaultConnect({ user }) {
  return io(SOCKET_URL, {
    auth: { token: localStorage.getItem('token') },
    extraHeaders: {
      'x-demo-role': user?.role || 'student',
      'x-demo-user-id': user?.id || 'demo-user',
    },
    reconnection: true,
    reconnectionAttempts: 5,
  });
}

export function useLiveSessionNotifications({
  user,
  connect = defaultConnect,
  enabled = true,
} = {}) {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.notifications?.preferences) || null;
  const optedOutRef = useRef(isLiveSessionOptedOut(preferences));

  useEffect(() => {
    optedOutRef.current = isLiveSessionOptedOut(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = connect({ user });

    const handleSessionEvent = (eventName) => (payload) => {
      // Opt-out prevents notification delivery (client-side guard).
      if (optedOutRef.current) return;

      const toast = buildLiveSessionToast(eventName, payload);
      if (!toast) return;

      dispatch(
        showToast({
          title: toast.title,
          message: toast.message,
          type: toast.type,
          link: toast.link,
          linkLabel: toast.linkLabel,
        })
      );

      dispatch(
        notificationReceived({
          id: `live-${eventName}-${Date.now()}`,
          title: toast.title,
          message: toast.message,
          type: 'live',
          read: false,
          createdAt: new Date().toISOString(),
          link: toast.link,
          linkLabel: toast.linkLabel,
        })
      );
    };

    const onStarted = handleSessionEvent(LIVE_SESSION_EVENTS.STARTED);
    const onEnded = handleSessionEvent(LIVE_SESSION_EVENTS.ENDED);

    socket.on(LIVE_SESSION_EVENTS.STARTED, onStarted);
    socket.on(LIVE_SESSION_EVENTS.ENDED, onEnded);

    return () => {
      socket.off(LIVE_SESSION_EVENTS.STARTED, onStarted);
      socket.off(LIVE_SESSION_EVENTS.ENDED, onEnded);
      socket.disconnect();
    };
  }, [user, dispatch, enabled, connect]);
}

export default useLiveSessionNotifications;