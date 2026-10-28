import { useCallback, useEffect, useRef, useState } from "react";
import { createForumSocket, readDefaultUserId, FORUM_EVENTS } from "../services/forumSocketClient";

/**
 * Forum real-time socket hook (Phase 8/9 / E2E Validation).
 *
 * Connects to the `/forum` namespace (real Socket.IO with automatic mock
 * fallback) and exposes typed subscriptions for notifications, moderation
 * updates, newly published discussions and bookmark changes. Callers provide
 * event handlers that are re-attached whenever the socket reconnects.
 */
export function useForumSocket({ userId } = {}) {
  const [mode, setMode] = useState("connecting");
  const [socket, setSocket] = useState(null);
  const handlersRef = useRef(new Map());
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    createForumSocket({ userId: userId || readDefaultUserId() }).then(
      ({ socket: next, mode: connectionMode }) => {
        if (cancelled) {
          next.disconnect();
          return;
        }
        socketRef.current = next;
        setSocket(next);
        setMode(connectionMode);

        handlersRef.current.forEach((handlers, event) => {
          handlers.forEach((handler) => next.on(event, handler));
        });
      }
    );

    return () => {
      cancelled = true;
      const current = socketRef.current;
      if (current) {
        current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
    };
  }, [userId]);

  const subscribe = useCallback((event, handler) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, []);
    handlersRef.current.get(event).push(handler);
    const current = socketRef.current;
    if (current) current.on(event, handler);

    return () => {
      const list = handlersRef.current.get(event) || [];
      const index = list.indexOf(handler);
      if (index !== -1) list.splice(index, 1);
      const socketNow = socketRef.current;
      if (socketNow) socketNow.off(event, handler);
    };
  }, []);

  const emit = useCallback((event, payload) => {
    const current = socketRef.current;
    if (current) current.emit(event, payload);
  }, []);

  return { mode, socket, subscribe, emit, events: FORUM_EVENTS };
}