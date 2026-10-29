const fs = require("node:fs/promises");
const path = require("node:path");
const { recheckCertificateReceipt } = require("../acceptance");

async function verifyCertificateReceipt({
  reportFile = path.resolve(__dirname, "../../../deliverables/assessment-cert-e2e.json"),
  receiptFile = process.env.LMS_E2E_EMAIL_RECEIPT_FILE,
  checkedAt = new Date(),
} = {}) {
  if (!receiptFile)
    throw new Error(
      "Set LMS_E2E_EMAIL_RECEIPT_FILE to actual recipient-confirmed inbox evidence. No email was sent and the recorded flow was preserved.",
    );
  const report = JSON.parse(await fs.readFile(reportFile, "utf8"));
  const receipt = JSON.parse(await fs.readFile(receiptFile, "utf8"));
  const verified = recheckCertificateReceipt(report, receipt, checkedAt);
  await fs.writeFile(reportFile, JSON.stringify(verified, null, 2) + "\n");
  return verified;
}

if (require.main === module) {
  require("dotenv").config({ quiet: true });
  verifyCertificateReceipt()
    .then((report) => {
      console.log(JSON.stringify({
        status: report.status,
        certificateNo: report.certificateNo,
        receiptStatus: report.receiptStatus,
        receiptReason: report.receiptReason,
        flowTimeSeconds: report.flowTimeSeconds,
        emailDeliverySeconds: report.emailDeliverySeconds,
      }, null, 2));
      if (report.status !== "PASS") process.exitCode = 2;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { verifyCertificateReceipt };
