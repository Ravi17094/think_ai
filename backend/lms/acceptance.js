function timestamp(value, requireString = false) {
  if (!requireString && value instanceof Date) return value.getTime();
  if (typeof value !== "string") return NaN;
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!parts) return NaN;
  const [, year, month, day, hour, minute, second, offset] = parts;
  const date = new Date(Date.UTC(+year, +month - 1, +day));
  if (
    date.getUTCFullYear() !== +year ||
    date.getUTCMonth() !== +month - 1 ||
    date.getUTCDate() !== +day ||
    +hour > 23 ||
    +minute > 59 ||
    +second > 59 ||
    (offset !== "Z" && (+offset.slice(1, 3) > 23 || +offset.slice(4) > 59))
  )
    return NaN;
  return Date.parse(value);
}

function receiptEvidence({
  receipt,
  certificateNo,
  link,
  submittedAt,
  checkedAt = new Date(),
}) {
  const result = {
    recipientDeliveryConfirmed: false,
    emailDeliverySeconds: null,
    emailWithin30Seconds: null,
    receiptStatus: "PENDING_RECEIPT",
    receiptReason: "Recipient inbox receipt evidence was not supplied.",
    receivedAt: null,
  };
  if (receipt === undefined || receipt === null) return result;
  function invalid(reason) {
    return {
      ...result,
      receiptStatus: "INVALID_RECEIPT",
      receiptReason: reason,
    };
  }
  if (typeof receipt !== "object" || Array.isArray(receipt))
    return invalid("Receipt evidence must be an object.");
  if (!certificateNo || receipt.certificateNo !== certificateNo)
    return invalid("Receipt certificate number does not match this run.");
  if (!link || receipt.link !== link)
    return invalid(
      "Receipt must contain this certificate's stable authenticated app link.",
    );
  const received = timestamp(receipt.receivedAt, true);
  const submitted = timestamp(submittedAt);
  const checked = timestamp(checkedAt);
  if (![received, submitted, checked].every(Number.isFinite))
    return invalid(
      "Receipt and run timestamps must be valid ISO timestamps with an explicit timezone.",
    );
  if (received < submitted)
    return invalid("Receipt predates the assessment submission.");
  if (received > checked)
    return invalid("Receipt is later than the evidence-check time.");
  const seconds = (received - submitted) / 1000;
  return {
    recipientDeliveryConfirmed: true,
    emailDeliverySeconds: seconds,
    emailWithin30Seconds: seconds < 30,
    receiptStatus: "CONFIRMED_RECEIPT",
    receiptReason:
      seconds < 30
        ? "Recipient receipt is within the under-30-second target."
        : "Recipient receipt misses the under-30-second target.",
    receivedAt: new Date(received).toISOString(),
  };
}

// An inbox receipt normally arrives after the initial acceptance runner exits.
// Recheck that same completed flow without creating another course or email.
function recheckCertificateReceipt(report, receipt, checkedAt = new Date()) {
  if (
    !report ||
    !["PASS", "PENDING_RECIPIENT_OR_TIMING_VERIFICATION"].includes(report.status) ||
    report.environment !== "staging" ||
    !report.certificateNo ||
    !report.stableLink ||
    !report.submittedAt ||
    report.pdfDownloaded !== true ||
    report.emailProviderAccepted !== true ||
    typeof report.flowTimeSeconds !== "number" ||
    !Number.isFinite(report.flowTimeSeconds) ||
    report.flowTimeSeconds < 0
  )
    throw new Error(
      "Receipt verification requires an existing finished staging flow with downloaded PDF, confirmed provider acceptance, certificate number, stable link and measured flow time. Run the updated E2E runner once; this check never creates fixtures or sends email.",
    );
  const checked = timestamp(checkedAt);
  if (!Number.isFinite(checked))
    throw new Error("Receipt verification requires a valid check timestamp.");
  const evidence = receiptEvidence({
    receipt,
    certificateNo: report.certificateNo,
    link: report.stableLink,
    submittedAt: report.submittedAt,
    checkedAt,
  });
  const flowWithin30Seconds = report.flowTimeSeconds < 30;
  const within30Seconds =
    flowWithin30Seconds && evidence.emailWithin30Seconds === true;
  return {
    ...report,
    ...evidence,
    receiptCheckedAt: new Date(checked).toISOString(),
    flowWithin30Seconds,
    within30Seconds,
    status:
      within30Seconds && evidence.recipientDeliveryConfirmed
        ? "PASS"
        : "PENDING_RECIPIENT_OR_TIMING_VERIFICATION",
  };
}

module.exports = { receiptEvidence, recheckCertificateReceipt };
