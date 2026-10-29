const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const { internalCallbackAuth } = require("../../middleware/internalCallbackAuth");

const secrets = {
  JUDGE0_CALLBACK_SECRET: "judge0-callback-test-only-32-bytes-minimum",
  RECORDING_CALLBACK_SECRET: "recording-callback-test-only-32-bytes-minimum",
};
for (const [service, method, route, envName, header, otherHeader] of [
  ["judge0", "put", "/api/code/callback", "JUDGE0_CALLBACK_SECRET", "x-judge0-callback-secret", "x-recording-callback-secret"],
  ["recording", "post", "/api/v1/sessions/callback/recording", "RECORDING_CALLBACK_SECRET", "x-recording-callback-secret", "x-judge0-callback-secret"],
]) {
  function appFor(env = secrets) {
    const app = express();
    let calls = 0;
    app.use(express.json());
    app[method](route, internalCallbackAuth(service, env), (_req, res) => { calls++; res.json({ success: true }); });
    return { app, calls: () => calls };
  }
  test(`${service}: a configured dedicated header authorizes its callback`, async () => {
    const fixture = appFor();
    const response = await request(fixture.app)[method](route).set(header, secrets[envName]).send({ token: "execution" });
    assert.equal(response.status, 200);
    assert.equal(fixture.calls(), 1);
  });
  test(`${service}: missing/tampered/wrong-service credentials and user JWT cannot authorize callbacks`, async () => {
    const fixture = appFor();
    const calls = [
      request(fixture.app)[method](route),
      request(fixture.app)[method](route).set(header, "tampered"),
      request(fixture.app)[method](route).set(header, secrets[envName].slice(0, -1) + "X"),
      request(fixture.app)[method](route).set(otherHeader, secrets[envName]),
      request(fixture.app)[method](route).set("Authorization", "Bearer user-admin-jwt").set("x-demo-role", "Admin"),
      request(fixture.app)[method](route + `?secret=${encodeURIComponent(secrets[envName])}`),
    ];
    for (const call of calls) assert.equal((await call.send({ secret: secrets[envName], token: "execution" })).status, 401);
    assert.equal(fixture.calls(), 0);
  });
  test(`${service}: absent or weak service configuration fails closed despite general JWT secrets`, async () => {
    for (const value of [undefined, "", "short"]) {
      const env = { ACCESS_TOKEN_SECRET: secrets[envName], JWT_SECRET: secrets[envName], [envName]: value };
      const fixture = appFor(env);
      const response = await request(fixture.app)[method](route).set(header, secrets[envName]).send({});
      assert.equal(response.status, 503);
      assert.equal(fixture.calls(), 0);
    }
  });
}
