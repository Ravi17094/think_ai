const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createService } = require("../service");

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value instanceof Date) return +row[key] === +value;
    if (value && typeof value === "object" && value.lt)
      return +row[key] < +value.lt;
    if (value && typeof value === "object" && value.lte)
      return +row[key] <= +value.lte;
    return row[key] === value;
  });
}

function fixture(issue) {
  let clock = new Date("2026-10-26T10:00:00Z");
  const job = {
    id: 11,
    enrollmentId: 7,
    status: "GENERATE",
    attempts: 2,
    updatedAt: new Date(0),
    nextAttemptAt: new Date(0),
  };
  const enrollment = {
    id: 7,
    courseAccess: true,
    batch: {
      course: {
        completionThreshold: 80,
        modules: [{ lessons: [{ id: 1 }], assessments: [] }],
      },
    },
  };
  const deliveredStates = [];
  const db = {
    assessmentSubmission: {
      updateMany: async () => ({ count: 0 }),
      findMany: async () => [],
    },
    enrollment: { findUnique: async () => enrollment },
    lessonProgress: {
      findMany: async () => [{ lessonId: 1, completed: true }],
    },
    lmsCertificateDelivery: {
      findMany: async ({ where }) =>
        matches(job, where) ? [structuredClone(job)] : [],
      updateMany: async ({ where, data }) => {
        if (!matches(job, where)) return { count: 0 };
        for (const [key, value] of Object.entries(data)) {
          job[key] =
            value && typeof value === "object" && value.increment
              ? job[key] + value.increment
              : structuredClone(value);
        }
        if (!data.updatedAt) job.updatedAt = new Date(clock);
        return { count: 1 };
      },
    },
  };
  const service = createService({
    db,
    executor: {},
    now: () => new Date(clock),
    certificates: {
      issue,
      deliver: async () => {
        deliveredStates.push(job.status);
      },
    },
  });
  return {
    service,
    job,
    deliveredStates,
    advance: () => {
      clock = new Date(+clock + 130000);
    },
  };
}

function deferredIssue() {
  let started, resolve, reject;
  const began = new Promise((ready) => {
    started = ready;
  });
  const result = new Promise((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return {
    began,
    resolve: () => resolve({}),
    reject: () => reject(new Error("Old generation failed")),
    issue: async () => {
      started();
      return result;
    },
  };
}

for (const status of ["SENT", "UNKNOWN"]) {
  for (const outcome of ["resolve", "reject"]) {
    test(`a stale generation that ${outcome}s cannot reopen another worker's ${status} delivery`, async () => {
      const pendingIssue = deferredIssue();
      const { service, job, deliveredStates, advance } = fixture(
        pendingIssue.issue,
      );
      const pending = service.gradePending();
      await pendingIssue.began;
      assert.equal(job.status, "GENERATING");
      advance();
      Object.assign(job, {
        status,
        updatedAt: new Date("2026-10-26T10:02:10Z"),
        attempts: 3,
      });
      pendingIssue[outcome]();
      await pending;
      assert.equal(job.status, status);
      assert.equal(job.attempts, 3);
      assert.deepEqual(deliveredStates, [status]);
    });
  }
}

for (const outcome of ["resolve", "reject"]) {
  test(`a stale generation that ${outcome}s cannot modify a newer GENERATING lease`, async () => {
    const pendingIssue = deferredIssue();
    const { service, job, advance } = fixture(pendingIssue.issue);
    const pending = service.gradePending();
    await pendingIssue.began;
    const previousLease = +job.updatedAt;
    advance();
    job.updatedAt = new Date("2026-10-26T10:02:10Z");
    job.attempts = 3;
    pendingIssue[outcome]();
    await pending;
    assert.equal(job.status, "GENERATING");
    assert.notEqual(+job.updatedAt, previousLease);
    assert.equal(job.attempts, 3);
  });
}

test("the current generation lease becomes PENDING before the delivery worker runs", async () => {
  let issued;
  const { service, job, deliveredStates } = fixture(
    async (enrollment, summary) => {
      issued = { enrollment, summary };
    },
  );
  await service.gradePending();
  assert.equal(issued.enrollment.id, 7);
  assert.equal(issued.summary.eligible, true);
  assert.equal(job.status, "PENDING");
  assert.equal(job.attempts, 0);
  assert.deepEqual(deliveredStates, ["PENDING"]);
});

test("a failure owned by the current generation lease remains safely retryable", async () => {
  const { service, job, deliveredStates } = fixture(async () => {
    throw new Error("S3 unavailable");
  });
  await service.gradePending();
  assert.equal(job.status, "GENERATE");
  assert.equal(job.attempts, 3);
  assert.equal(job.lastError, "S3 unavailable");
  assert.equal(job.nextAttemptAt.toISOString(), "2026-10-26T10:01:00.000Z");
  assert.deepEqual(deliveredStates, ["GENERATE"]);
});
