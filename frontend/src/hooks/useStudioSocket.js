import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { io } from "socket.io-client";
import { appendStudioMessage } from "../features/studio/studioSlice";

export const STUDIO_EVENTS = {
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_USER_JOINED: "room:user_joined",
  ROOM_USER_LEFT: "room:user_left",
  CHAT_MESSAGE: "chat:message",
  POLL_CREATE: "poll:create",
  POLL_STARTED: "poll:started",
  POLL_VOTE: "poll:vote",
  POLL_RESULTS: "poll:results",
  POLL_ENDED: "poll:ended",
  USER_ACTIVITY: "user:activity",
};

export function useStudioSocket({ sessionId, user }) {
  const dispatch = useDispatch();
  const [mode, setMode] = useState("connecting");
  const handlersRef = useRef(new Map());
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const socket = io(window.location.origin, {
      auth: { token },
      extraHeaders: {
        "x-demo-role": user?.role || "student",
        "x-demo-user-id": user?.id || "demo-user"
      },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setMode("connected");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setMode("error");
    });

    socket.on("disconnect", () => {
      setMode("disconnected");
    });

    socket.on(STUDIO_EVENTS.CHAT_MESSAGE, (msg) => {
      dispatch(appendStudioMessage(msg));
    });

    handlersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setMode("disconnected");
    };
  }, [sessionId, user?.id, user?.role, dispatch]);

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

  const emit = useCallback((event, payload, ack) => {
    if (socketRef.current) {
      socketRef.current.emit(event, payload, ack);
    }
  }, []);

  return { mode, subscribe, emit, events: STUDIO_EVENTS };
}