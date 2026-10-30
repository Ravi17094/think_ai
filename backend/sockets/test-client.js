const { io } = require('socket.io-client');

const socket = io('http://localhost:3000', {
  extraHeaders: { 'x-demo-role': 'admin' },
});

socket.on('connect', () => {
  console.log('connected as', socket.id);
  socket.emit('room:join', 'test-room', (ack) => console.log('join ack:', ack));
});

socket.on('session:started', (session) => console.log('SESSION STARTED:', session));
socket.on('session:ended', (session) => console.log('SESSION ENDED:', session));
socket.on('user:activity', (data) => console.log('ACTIVITY RECEIVED:', data));

setTimeout(() => {
  socket.emit('user:activity', { roomName: 'test-room', action: 'answered_question' });
}, 4000);

setTimeout(() => {
  socket.emit('room:leave', 'test-room', (ack) => console.log('leave ack:', ack));
}, 6000);

socket.on('connect_error', (err) => {
  console.log('connection failed:', err.message);
});