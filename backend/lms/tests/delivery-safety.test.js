const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCertificates } = require("../certificates");
const { createReportDelivery } = require("../report-delivery");
const {
  dispatchDelivery,
  recoverDeliveries,
  sendThroughSendGrid,
} = require("../email-delivery");

function matches(row, where = {}) {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (expected instanceof Date) return +actual === +expected;
    if (expected && typeof expected === "object") {
      if (expected.in) return expected.in.includes(actual);
      if (expected.lt) return +actual < +expected.lt;
      if (expected.lte) return +actual <= +expected.lte;
    }
    return actual === expected;
  });
}
function outbox(initial = []) {
  const table = {
    rows: structuredClone(initial),
    failSentWrites: 0,
    async updateMany({ where, data }) {
      if (data.status === "SENT" && table.failSentWrites-- > 0)
        throw new Error(
          "Database acknowledgement failed after provider acceptance.",
        );
      const found = table.rows.filter((row) => matches(row, where));
      found.forEach((row) => Object.assign(row, structuredClone(data)));
      return { count: found.length };
    },
    async findMany({ where } = {}) {
      return structuredClone(table.rows.filter((row) => matches(row, where)));
    },
    async upsert({ where, create }) {
      const existing = table.rows.find((row) => matches(row, where));
      if (existing) return structuredClone(existing);
      const row = {
        id: table.rows.length + 1,
        status: "PENDING",
        attempts: 0,
        updatedAt: new Date(0),
        nextAttemptAt: new Date(0),
        ...create,
      };
      table.rows.push(row);
      return structuredClone(row);
    },
  };
  return table;
}
const env = {
  SENDGRID_API_KEY: "test-only",
  FROM_EMAIL: "sender@example.invalid",
  LMS_APP_URL: "https://app.example.invalid",
  LMS_CERTIFICATE_BUCKET: "test-bucket",
};
const reportEnv = {
  ...env,
  LMS_REPORTS_ENABLED: "true",
  LMS_REPORT_RECIPIENTS: "reports@example.invalid",
};
const certificate = {
  id: 9,
  enrollmentId: 7,
  courseName: "Test course",
  pdfUrl: "s3://test-bucket/certificates/CERT-test.pdf",
  enrollment: { studentEmail: "learner@example.invalid" },
};
function certificateFixture(options = {}) {
  const table = outbox([
    {
      id: 1,
      enrollmentId: 7,
      status: "PENDING",
      attempts: 0,
      updatedAt: new Date(0),
      nextAttemptAt: new Date(0),
    },
  ]);
  const messages = [];
  const config = {
    db: {
      lmsCertificateDelivery: table,
      certificate: { findUnique: async () => certificate },
    },
    env: { ...env, ...options.env },
    s3: {
      send: async () => {
        throw new Error("Unexpected S3 request.");
      },
    },
    sendEmail:
      options.send ||
      (async (message) => {
        messages.push(message);
      }),
  };
  return { table, messages, config, service: createCertificates(config) };
}
const sampleAnalytics = {
  kpis: {
    enrollmentCount: 0,
    completionRate: 0,
    averageScore: 0,
    activeUsers: 0,
    attendancePercentage: null,
  },
  courses: [],
  trend: [],
  definitions: {},
};
function reportFixture(options = {}) {
  const table = outbox();
  const messages = [];
  const config = {
    db: { lmsReportDelivery: table },
    analytics: async () => sampleAnalytics,
    env: { ...reportEnv, ...options.env },
    now: () => new Date("2026-10-26T10:00:00Z"),
    send:
      options.send ||
      (async (message) => {
        messages.push(message);
      }),
  };
  return { table, messages, config, service: createReportDelivery(config) };
}

test("certificate delivery has a durable send boundary and a stable reconciliation key", async () => {
  const { table, messages, service } = certificateFixture();
  await service.deliver();
  await service.deliver();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].customArgs.delivery_key, "certificate:7");
  assert.match(
    messages[0].text,
    /https:\/\/app\.example\.invalid\/learner\/certificates\/9/,
  );
  assert.equal(table.rows[0].status, "SENT");
});

test("report delivery persists one period and does not send it again", async () => {
  const { table, messages, service } = reportFixture();
  await service.tick();
  await service.tick();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].attachments.length, 2);
  assert.equal(messages[0].customArgs.delivery_key, "report:weekly:2026-10-26");
  assert.equal(table.rows[0].status, "SENT");
});

for (const kind of ["certificate", "report"]) {
  test(`${kind}: a crash-equivalent acknowledgement failure after send never triggers an automatic second email`, async () => {
    const fixture =
      kind === "certificate" ? certificateFixture() : reportFixture();
    fixture.table.failSentWrites = 1;
    const tick = () =>
      kind === "certificate"
        ? fixture.service.deliver()
        : fixture.service.tick();
    await tick();
    assert.equal(fixture.messages.length, 1);
    assert.equal(fixture.table.rows[0].status, "UNKNOWN");
    assert.match(fixture.table.rows[0].lastError, /Reconcile delivery_key=/);
    fixture.table.rows[0].updatedAt = new Date(0);
    await tick();
    assert.equal(fixture.messages.length, 1);
  });

  test(`${kind}: concurrent workers claim only one dispatch`, async () => {
    const fixture =
      kind === "certificate" ? certificateFixture() : reportFixture();
    const second =
      kind === "certificate"
        ? createCertificates(fixture.config)
        : createReportDelivery(fixture.config);
    await Promise.all(
      kind === "certificate"
        ? [fixture.service.deliver(), second.deliver()]
        : [fixture.service.tick(), second.tick()],
    );
    assert.equal(fixture.messages.length, 1);
    assert.equal(fixture.table.rows[0].status, "SENT");
  });
}

test("expired dispatches including legacy SENDING are quarantined, never returned to the retry queue", async () => {
  const table = outbox(
    ["DISPATCHING", "SENDING", "PREPARING"].map((status, i) => ({
      id: i + 1,
      status,
      updatedAt: new Date(0),
      attempts: 1,
    })),
  );
  await recoverDeliveries(table, new Date(120001), 120000);
  assert.deepEqual(
    table.rows.map((row) => row.status),
    ["UNKNOWN", "UNKNOWN", "PENDING"],
  );
});

test("an expired preparation cannot dispatch after another worker reclaims the job", async () => {
  let clock = new Date(1000),
    release;
  const table = outbox([
    { id: 1, status: "PENDING", attempts: 0, updatedAt: new Date(0) },
  ]);
  const job = structuredClone(table.rows[0]);
  let sent = 0;
  const options = {
    table,
    job,
    deliveryKey: "test:1",
    now: () => clock,
    send: async () => {
      sent++;
    },
  };
  const first = dispatchDelivery({
    ...options,
    prepare: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  clock = new Date(130001);
  await recoverDeliveries(table, clock, 120000);
  assert.equal(
    (
      await dispatchDelivery({
        ...options,
        prepare: async () => ({ to: "test@example.invalid" }),
      })
    ).status,
    "sent",
  );
  release({ to: "test@example.invalid" });
  assert.equal((await first).status, "lease_lost");
  assert.equal(sent, 1);
});

test("a send timeout is ambiguous and cannot cause a duplicate on the next tick", async () => {
  let sends = 0;
  const { table, service } = certificateFixture({
    env: { LMS_EMAIL_TIMEOUT_MS: "10" },
    send: () => {
      sends++;
      return new Promise(() => {});
    },
  });
  await service.deliver();
  assert.equal(table.rows[0].status, "UNKNOWN");
  await service.deliver();
  assert.equal(sends, 1);
});

test("confirmed provider rejection is retryable, whereas an unknown network outcome is quarantined", async () => {
  let sends = 0;
  const fixture = certificateFixture({
    send: async () => {
      sends++;
      if (sends === 1)
        throw Object.assign(new Error("Rate limited"), {
          response: { statusCode: 429 },
        });
    },
  });
  await fixture.service.deliver();
  assert.equal(fixture.table.rows[0].status, "PENDING");
  fixture.table.rows[0].nextAttemptAt = new Date(0);
  await fixture.service.deliver();
  assert.equal(fixture.table.rows[0].status, "SENT");
  assert.equal(sends, 2);
  const unknown = certificateFixture({
    send: async () => {
      throw new Error("Connection reset after request");
    },
  });
  await unknown.service.deliver();
  assert.equal(unknown.table.rows[0].status, "UNKNOWN");
});

test("missing configuration fails before dispatch and can safely retry after configuration is supplied", async () => {
  const fixture = certificateFixture({ env: { SENDGRID_API_KEY: "" } });
  await fixture.service.deliver();
  assert.equal(fixture.table.rows[0].status, "PENDING");
  assert.equal(fixture.messages.length, 0);
  fixture.config.env.SENDGRID_API_KEY = "test-only";
  fixture.table.rows[0].nextAttemptAt = new Date(0);
  await fixture.service.deliver();
  assert.equal(fixture.messages.length, 1);
  assert.equal(fixture.table.rows[0].status, "SENT");
});

test("a dev adapter response is never recorded as delivered", async () => {
  const { table, service } = certificateFixture({
    send: async () => ({ ok: true, dev: true }),
  });
  await service.deliver();
  assert.equal(table.rows[0].status, "PENDING");
  assert.match(table.rows[0].lastError, /did not send/);
});

test("repeating certificate generation cannot reset an ambiguous delivery into the retry queue", async () => {
  let sends = 0;
  const fixture = certificateFixture({
    send: async () => {
      sends++;
      throw new Error("Provider connection closed after request.");
    },
  });
  await fixture.service.deliver();
  assert.equal(fixture.table.rows[0].status, "UNKNOWN");
  await fixture.service.issue(
    { id: 7, courseAccess: true, batch: { course: { title: "Test course" } } },
    { eligible: true },
  );
  await fixture.service.deliver();
  assert.equal(fixture.table.rows[0].status, "UNKNOWN");
  assert.equal(sends, 1);
});

test("the default SendGrid adapter requires actual HTTP 202 acceptance and preserves the delivery key", async (t) => {
  const mail = require("@sendgrid/mail");
  const oldSend = mail.send,
    oldSetApiKey = mail.setApiKey;
  t.after(() => {
    mail.send = oldSend;
    mail.setApiKey = oldSetApiKey;
  });
  let message;
  mail.setApiKey = () => {};
  mail.send = async (value) => {
    message = value;
    return [{ statusCode: 202 }];
  };
  await sendThroughSendGrid(
    {
      to: "test@example.invalid",
      customArgs: { delivery_key: "certificate:7" },
    },
    env,
  );
  assert.equal(message.customArgs.delivery_key, "certificate:7");
  assert.equal(message.from, env.FROM_EMAIL);
  mail.send = async () => ({ ok: true, dev: true });
  await assert.rejects(
    sendThroughSendGrid({}, env),
    /acceptance was not confirmed/,
  );
});

test("AWS_S3_BUCKET remains a supported alias without issuing an unnecessary upload", async () => {
  const fixture = certificateFixture({
    env: { LMS_CERTIFICATE_BUCKET: "", AWS_S3_BUCKET: "test-bucket" },
  });
  const result = await fixture.service.issue(
    { id: 7, courseAccess: true, batch: { course: { title: "Test course" } } },
    { eligible: true },
  );
  assert.equal(result.pdfUrl, certificate.pdfUrl);
});

test("disabled scheduled delivery creates no job and calls neither analytics nor email", async () => {
  const fixture = reportFixture({ env: { LMS_REPORTS_ENABLED: "false" } });
  fixture.config.analytics = () => {
    throw new Error("Unexpected analytics request.");
  };
  assert.deepEqual(await createReportDelivery(fixture.config).tick(), {
    status: "disabled",
  });
  assert.equal(fixture.messages.length, 0);
  assert.equal(fixture.table.rows.length, 0);
});
