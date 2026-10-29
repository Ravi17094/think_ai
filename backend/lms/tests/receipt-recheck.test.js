const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { recheckCertificateReceipt } = require("../acceptance");
const { verifyCertificateReceipt } = require("../scripts/verify-certificate-receipt");

const flow = {
  status: "PENDING_RECIPIENT_OR_TIMING_VERIFICATION",
  environment: "staging",
  submittedAt: "2026-10-26T10:00:00.000Z",
  flowTimeSeconds: 9.5,
  pdfDownloaded: true,
  emailProviderAccepted: true,
  certificateNo: "CERT-original-run",
  certificateId: 7,
  stableLink: "https://app.example.invalid/learner/certificates/7",
  courseId: 12,
  enrollmentId: 15,
};
const receipt = {
  certificateNo: flow.certificateNo,
  link: flow.stableLink,
  receivedAt: "2026-10-26T10:00:12.250Z",
};
const checkedAt = "2026-10-26T10:05:00.000Z";

test("a later inbox check verifies the original submission timing without rerunning the flow", () => {
  const verified = recheckCertificateReceipt(flow, receipt, checkedAt);
  assert.equal(verified.status, "PASS");
  assert.equal(verified.emailDeliverySeconds, 12.25);
  assert.equal(verified.flowTimeSeconds, 9.5);
  assert.equal(verified.submittedAt, flow.submittedAt);
  assert.equal(verified.courseId, flow.courseId);
  assert.equal(verified.enrollmentId, flow.enrollmentId);
  assert.equal(flow.status, "PENDING_RECIPIENT_OR_TIMING_VERIFICATION");
});

test("receipt-only verification cannot promote an unrun, failed or incomplete cloud flow", () => {
  for (const change of [
    { status: "NOT_RUN" },
    { status: "FAIL" },
    { environment: "local" },
    { pdfDownloaded: false },
    { emailProviderAccepted: false },
    { certificateNo: undefined },
    { stableLink: undefined },
    { submittedAt: undefined },
    { flowTimeSeconds: null },
    { flowTimeSeconds: -1 },
    { flowTimeSeconds: Infinity },
  ])
    assert.throws(
      () => recheckCertificateReceipt({ ...flow, ...change }, receipt, checkedAt),
      /existing finished staging flow/,
    );
});

test("receipt mismatch or late actual delivery cannot satisfy the 30 second acceptance target", () => {
  for (const changed of [
    { ...receipt, certificateNo: "CERT-another-run" },
    { ...receipt, link: "https://wrong.example.invalid/7" },
    { ...receipt, receivedAt: "2026-10-26T09:59:59.000Z" },
    { ...receipt, receivedAt: "2026-10-26T10:06:00.000Z" },
    { ...receipt, receivedAt: "2026-10-26T10:00:30.000Z" },
  ]) {
    const result = recheckCertificateReceipt(flow, changed, checkedAt);
    assert.equal(result.status, "PENDING_RECIPIENT_OR_TIMING_VERIFICATION");
    assert.equal(result.within30Seconds, false);
  }
  assert.equal(
    recheckCertificateReceipt({ ...flow, flowTimeSeconds: 30 }, receipt, checkedAt).status,
    "PENDING_RECIPIENT_OR_TIMING_VERIFICATION",
  );
});

test("receipt verifier updates only the existing evidence file and leaves incomplete evidence intact", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "patan-receipt-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const reportFile = path.join(directory, "report.json");
  const receiptFile = path.join(directory, "receipt.json");
  await fs.writeFile(reportFile, JSON.stringify(flow));
  await fs.writeFile(receiptFile, JSON.stringify(receipt));
  const result = await verifyCertificateReceipt({ reportFile, receiptFile, checkedAt });
  assert.equal(result.status, "PASS");
  assert.equal(JSON.parse(await fs.readFile(reportFile, "utf8")).certificateId, 7);
  assert.deepEqual((await fs.readdir(directory)).sort(), ["receipt.json", "report.json"]);
  await fs.writeFile(reportFile, JSON.stringify({ status: "NOT_RUN" }));
  const original = await fs.readFile(reportFile, "utf8");
  await assert.rejects(
    verifyCertificateReceipt({ reportFile, receiptFile, checkedAt }),
    /existing finished staging flow/,
  );
  assert.equal(await fs.readFile(reportFile, "utf8"), original);
  await assert.rejects(
    verifyCertificateReceipt({ reportFile, receiptFile: "", checkedAt }),
    /actual recipient-confirmed inbox evidence/,
  );
});
