// Regression test for `POST /api/live-studio/sessions/:id/join` returning
// `Route not found` (the Live Studio slice was never mounted on the app).
//
// This boots the real `app.js`, so it needs DATABASE_URL to be set (Prisma is
// connected at require time). It is therefore kept out of the default, DB-less
// suite and run via `npm run test:routes`.
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

// Stub the Postgres-backed service so this test never touches a database.
// The controller calls the service through its cached module object, so
// patching the exports here is enough.
const liveService = require("./src/live/liveService");
liveService.joinSession = async (sessionId, user) => ({
    id: sessionId,
    hostId: (user && user.id) || "u1",
    attendees: [],
});
liveService.getMessages = async () => [];

const app = require("./app");

test("POST /api/live-studio/sessions/:id/join is mounted", async () => {
    const res = await request(app)
        .post("/api/live-studio/sessions/s1/join")
        .set("x-user-id", "u1")
        .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, "s1");
});

test("the live-studio messages endpoint is mounted (full forum slice)", async () => {
    const res = await request(app)
        .get("/api/live-studio/sessions/s1/messages")
        .set("x-user-id", "u1");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
});

test("an unknown live-studio sub-route still 404s", async () => {
    const res = await request(app)
        .post("/api/live-studio/sessions/s1/nope")
        .set("x-user-id", "u1")
        .send({});

    assert.equal(res.status, 404);
});
