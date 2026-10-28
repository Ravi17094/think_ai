// Mount smoke test for the forum / community API surface that the frontend
// (`frontend/src/services/*.js`) calls. These routes were previously disabled
// on this branch (404s like `Route not found: GET /api/discussions`).
//
// Boots the real `app.js`, so DATABASE_URL must be set (Prisma is connected at
// require time). Kept out of the default, DB-less suite; run `npm run test:routes`.
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("./app");

const USER = { "x-user-id": "u1" };

const GET_ENDPOINTS = [
    ["/api/discussions?page=1&limit=10", "data"],
    ["/api/categories", "data"],
    ["/api/bookmarks", "data"],
    ["/api/tags", "data"],
    ["/api/notifications?userId=u1", "data"],
    ["/api/notifications/preferences/u1", "data"],
    ["/api/moderation/flagged", "data"],
    ["/api/moderation/users", "data"],
    ["/api/moderation/audit-log", "data"],
    ["/api/live-studio/sessions/s1", "data"],
    ["/api/live-studio/sessions/s1/messages", "data"],
];

for (const [path, key] of GET_ENDPOINTS) {
    test(`GET ${path} is mounted`, async () => {
        const res = await request(app).get(path).set(USER);
        assert.equal(res.status, 200, `${path} -> ${res.status} ${res.text}`);
        assert.equal(res.body.success, true);
        assert.ok(key in res.body, `expected "${key}" in response body`);
    });
}

test("POST /api/live-studio/sessions/s1/join is mounted", async () => {
    const res = await request(app)
        .post("/api/live-studio/sessions/s1/join")
        .set(USER)
        .send({});

    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.success, true);
});
