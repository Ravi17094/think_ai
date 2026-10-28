import { io } from "socket.io-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

/** Mobile real-time client. The JWT is sent to the Thinkz API only. */
export function connectLiveStudio({ token, user, onState, onMessage, onPoll, onError, onConnected }) {
  if (!API_URL) {
    // Do not update React state while the screen is rendering.
    setTimeout(() => onError?.("Live API is not configured on this phone yet."), 0);
    return { emit: () => {}, disconnect: () => {}, connect: () => {} };
  }
  const socket = io(`${API_URL}/studio`, {
    transports: ["websocket", "polling"],
    auth: { token, demoRole: user.role, demoUserId: user.id, demoName: user.name },
    // The screen owns the retry countdown so a learner can see what is happening.
    reconnection: false,
  });

  socket.on("connect", () => {
    socket.emit("session:join", { sessionId: "s1", user });
    onState({ status: "live", attendees: [] });
    onConnected?.();
  });
  socket.on("connect_error", () => onError?.("Could not reach the Thinkz API. Check the phone API address and backend."));
  socket.on("disconnect", () => onError?.("Live connection was disconnected."));
  socket.on("session:state", onState);
  socket.on("chat:new", onMessage);
  socket.on("poll:update", onPoll);
  return socket;
}
