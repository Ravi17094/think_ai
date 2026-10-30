const { io } = require('socket.io-client');

// Use a FIXED user id via demo-role header won't let us fix userId directly,
// so instead we simulate by reusing the SAME socket's reconnection feature.
const socket = io('http://localhost:3000', {
  extraHeaders: { 'x-demo-role': 'admin' , 'x-demo-user-id': `demo-fixed-user-1`},
  reconnection: true,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('connected as', socket.id);
  socket.emit('room:join', 'test-room', (ack) => console.log('join ack:', ack));
});

socket.on('disconnect', (reason) => {
  console.log('disconnected, reason:', reason);
});

socket.io.on('reconnect', (attempt) => {
  console.log('RECONNECTED after', attempt, 'attempt(s), new id:', socket.id);
});

socket.on('connect_error', (err) => {
  console.log('connection failed:', err.message);
});

// After 5 seconds, force-kill the underlying transport to simulate a network drop
setTimeout(() => {
  console.log('--- forcing disconnect to simulate network drop ---');
  socket.io.engine.close();
}, 5000);