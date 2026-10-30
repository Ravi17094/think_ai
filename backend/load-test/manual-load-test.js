const { io } = require("socket.io-client");

const TARGET = "http://localhost:3000";
const CONCURRENT_USERS = 220;

let connected = 0;
let failed = 0;
let completed = 0;

console.log(`Starting load test: ${CONCURRENT_USERS} concurrent connections...`);

for (let i = 0; i < CONCURRENT_USERS; i++) {
  const socket = io(TARGET, {
    extraHeaders: {
      "x-demo-role": "learner",
      "x-demo-user-id": `load-test-user-${i}`,
    },
    transports: ["websocket"],
    reconnection: false,
  });

  socket.on("connect", () => {
    connected++;
    socket.emit("room:join", "load-test-room", (ack) => {
      setTimeout(() => {
        socket.emit("room:leave", "load-test-room", () => {
          socket.disconnect();
          completed++;
          checkDone();
        });
      }, 3000);
    });
  });

  socket.on("connect_error", (err) => {
    failed++;
    checkDone();
  });
}

function checkDone() {
  if (connected + failed >= CONCURRENT_USERS && completed + failed >= CONCURRENT_USERS) {
    console.log("\n--- RESULTS ---");
    console.log(`Connected: ${connected}/${CONCURRENT_USERS}`);
    console.log(`Failed: ${failed}/${CONCURRENT_USERS}`);
    console.log(`Completed full flow: ${completed}/${CONCURRENT_USERS}`);
    process.exit(0);
  }
}

setTimeout(() => {
  console.log("\n--- TIMEOUT: RESULTS SO FAR ---");
  console.log(`Connected: ${connected}/${CONCURRENT_USERS}`);
  console.log(`Failed: ${failed}/${CONCURRENT_USERS}`);
  console.log(`Completed full flow: ${completed}/${CONCURRENT_USERS}`);
  process.exit(0);
}, 15000);