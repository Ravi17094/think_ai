const test = require("node:test");
const assert = require("node:assert/strict");

const repositoryPath = require.resolve("./liveRepository");
const servicePath = require.resolve("./liveService");

function session(id = "session-1") {
    return {
        id,
        title: "Real scheduled class",
        hostId: "instructor-1",
        status: "scheduled",
        scheduledAt: new Date("2026-11-09T10:00:00.000Z"),
        startedAt: new Date("2026-11-09T10:00:00.000Z"),
        attendees: [], messages: [], polls: [], breakouts: []
    };
}

function loadService(repository) {
    delete require.cache[servicePath];
    require.cache[repositoryPath] = { id: repositoryPath, filename: repositoryPath, loaded: true, exports: repository };
    return require("./liveService");
}

test("unknown live sessions are rejected instead of creating a demo row", async () => {
    const service = loadService({ getSession: async () => null });
    await assert.rejects(() => service.getSession("unknown"), (error) => error.code === "NOT_FOUND");
    await assert.rejects(() => service.joinSession("unknown", { id: "learner-1" }), (error) => error.code === "NOT_FOUND");
});

test("instructor-created sessions are listed and retain their schedule", async () => {
    const rows = new Map();
    const repository = {
        getSession: async (id) => rows.get(id) || null,
        listSessions: async () => [...rows.values()],
        upsertSession: async (value) => {
            rows.set(value.id, session(value.id));
            rows.get(value.id).title = value.title;
            rows.get(value.id).hostId = value.hostId;
            rows.get(value.id).status = value.status;
        },
        updateSessionStatus: async (id, status, scheduledAt) => {
            const value = rows.get(id); value.status = status; value.scheduledAt = scheduledAt; return value;
        }
    };
    const service = loadService(repository);
    const created = await service.createSession({ id: "session-2", title: "TA review", hostId: "instructor-2", scheduledAt: "2026-11-10T10:00:00.000Z" });
    const listed = await service.listSessions();

    assert.equal(created.id, "session-2");
    assert.equal(created.status, "scheduled");
    assert.equal(listed.length, 1);
    assert.equal(listed[0].title, "TA review");
});
