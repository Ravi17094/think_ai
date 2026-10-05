import { io } from "socket.io-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000";

/** Mobile real-time client. The JWT is sent to the Thinkz API only. */
export function connectLiveStudio({ token, user, onState, onMessage, onPoll }) {
  const socket = io(`${API_URL}/studio`, {
    transports: ["websocket", "polling"],
    auth: { token, demoRole: user.role, demoUserId: user.id, demoName: user.name },
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => socket.emit("session:join", { sessionId: "s1", user }));
  socket.on("session:state", onState);
  socket.on("chat:new", onMessage);
  socket.on("poll:update", onPoll);
  return socket;
}
