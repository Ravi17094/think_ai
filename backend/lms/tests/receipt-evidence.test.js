const { test } = require("node:test");
const assert = require("node:assert/strict");
const { receiptEvidence } = require("../acceptance");

const certificateNo = "CERT-receipt-test";
const link = "https://app.example.invalid/learner/certificates/9";
const submittedAt = new Date("2026-10-26T10:00:00Z");
const checkedAt = new Date("2026-10-26T10:01:00Z");
const valid = { certificateNo, link, receivedAt: "2026-10-26T10:00:12.250Z" };
const inspect = (receipt) =>
  receiptEvidence({ receipt, certificateNo, link, submittedAt, checkedAt });

test("an actual matching recipient receipt measures submission-to-arrival time", () => {
  assert.deepEqual(inspect(valid), {
    recipientDeliveryConfirmed: true,
    emailDeliverySeconds: 12.25,
    emailWithin30Seconds: true,
    receiptStatus: "CONFIRMED_RECEIPT",
    receiptReason: "Recipient receipt is within the under-30-second target.",
    receivedAt: valid.receivedAt,
  });
});

test("missing receipt stays pending and never becomes a provider-acceptance success", () => {
  for (const receipt of [undefined, null]) {
    const result = inspect(receipt);
    assert.equal(result.recipientDeliveryConfirmed, false);
    assert.equal(result.emailDeliverySeconds, null);
    assert.equal(result.emailWithin30Seconds, null);
    assert.equal(result.receiptStatus, "PENDING_RECEIPT");
  }
});

test("a valid receipt arriving after 31 seconds fails the timing target", () => {
  const result = inspect({ ...valid, receivedAt: "2026-10-26T10:00:31Z" });
  assert.equal(result.recipientDeliveryConfirmed, true);
  assert.equal(result.emailDeliverySeconds, 31);
  assert.equal(result.emailWithin30Seconds, false);
});

test("the documented under-30-second target excludes exactly 30 seconds", () => {
  const result = inspect({ ...valid, receivedAt: "2026-10-26T10:00:30Z" });
  assert.equal(result.emailDeliverySeconds, 30);
  assert.equal(result.emailWithin30Seconds, false);
});

test("earlier and future receipts cannot confirm delivery for this run", () => {
  for (const receivedAt of ["2026-10-26T09:59:59Z", "2026-10-26T10:01:01Z"]) {
    const result = inspect({ ...valid, receivedAt });
    assert.equal(result.recipientDeliveryConfirmed, false);
    assert.equal(result.emailDeliverySeconds, null);
    assert.equal(result.receiptStatus, "INVALID_RECEIPT");
  }
});

test("a different certificate or link cannot confirm this certificate's delivery", () => {
  for (const receipt of [
    { ...valid, certificateNo: "CERT-other" },
    { ...valid, link: "https://wrong.example.invalid/learner/certificates/9" },
    { ...valid, link: "https://app.example.invalid/learner/certificates/8" },
  ]) {
    assert.equal(inspect(receipt).recipientDeliveryConfirmed, false);
    assert.equal(inspect(receipt).receiptStatus, "INVALID_RECEIPT");
  }
});

test("truthy values, impossible dates and timezone-free times are not receipt evidence", () => {
  for (const receivedAt of [
    true,
    123,
    "not a timestamp",
    "2026-10-26T10:00:12",
    "2026-02-30T10:00:12Z",
  ]) {
    assert.equal(
      inspect({ ...valid, receivedAt }).recipientDeliveryConfirmed,
      false,
    );
    assert.equal(
      inspect({ ...valid, receivedAt }).receiptStatus,
      "INVALID_RECEIPT",
    );
  }
});

test("explicit timezone offsets are normalized before timing is compared", () => {
  const result = inspect({
    ...valid,
    receivedAt: "2026-10-26T15:30:12.250+05:30",
  });
  assert.equal(result.recipientDeliveryConfirmed, true);
  assert.equal(result.emailDeliverySeconds, 12.25);
  assert.equal(result.receivedAt, valid.receivedAt);
});
