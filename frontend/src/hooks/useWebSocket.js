import { useCallback, useEffect, useRef, useState } from "react";
import { createStudioSocket, STUDIO_EVENTS } from "../services/websocket";

/**
 * Live Studio socket hook (Phase 6/7).
 *
 * Connects to the `/studio` namespace (real Socket.IO with automatic mock
 * fallback) and exposes typed subscriptions for chat, polls and presence.
 */
export function useStudioSocket({ sessionId, user }) {
  const [mode, setMode] = useState("connecting");
  const handlersRef = useRef(new Map());
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    createStudioSocket({ sessionId, user }).then(({ socket, mode: connectionMode }) => {
      if (cancelled) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;
      setMode(connectionMode);

      // Make reconnection visible to the page instead of failing silently.
      socket.on("disconnect", () => setMode("reconnecting"));
      socket.on("connect_error", () => setMode("reconnecting"));
      socket.on("connect", () => setMode(connectionMode));

      // Re-attach any handler registered before the socket was ready.
      handlersRef.current.forEach((handlers, event) => {
        handlers.forEach((handler) => socket.on(event, handler));
      });
    });

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setMode("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const subscribe = useCallback((event, handler) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, []);
    handlersRef.current.get(event).push(handler);
    const socket = socketRef.current;
    if (socket) socket.on(event, handler);

    return () => {
      const list = handlersRef.current.get(event) || [];
      const index = list.indexOf(handler);
      if (index !== -1) list.splice(index, 1);
      if (socket) socket.off(event, handler);
    };
  }, []);

  const emit = useCallback((event, payload) => {
    if (socketRef.current) socketRef.current.emit(event, payload);
  }, []);

  return { mode, subscribe, emit, events: STUDIO_EVENTS };
}
