/**
 * Payment status projection used by the mobile success screen.
 *
 * `POST /api/v1/payments/confirm` is synchronous, but the RN screen polls
 * `GET /api/v1/payments/:id/status` while it renders. This store records each
 * confirmation result under the order id (and the confirmation id) so polling
 * resolves deterministically, including after a page reload in the same
 * process. The webhook ledger remains the source of truth for async provider
 * callbacks and is consulted as a fallback.
 */

const webhookService = require("./paymentWebhookService");

const records = new Map();

const UI_FAILURE_REASONS = {
    card_declined: "declined",
    insufficient_funds: "insufficient_funds",
    expired_card: "expired",
    processing_error: "network",
    timeout: "network",
};

function toUiFailureReason(code) {
    if (!code) return "unknown";
    return UI_FAILURE_REASONS[code] || "unknown";
}

function buildPayment(input, result) {
    return {
        id: input.orderId,
        planName: input.courseTitle || input.courseId || "Course",
        amount: Number(input.amount || 0),
        currency: input.currency || "INR",
        transactionId: result.confirmationId || input.orderId,
        paidAt: new Date().toISOString(),
        courseId: input.courseId,
        courseTitle: input.courseTitle,
        receiptEmail: input.email,
        failureReason: result.success ? undefined : toUiFailureReason(result.failureCode),
    };
}

function recordConfirmation(input, result) {
    const payment = buildPayment(input, result);
    const record = {
        status: result.success ? "confirmed" : "failed",
        payment,
        failureCode: result.failureCode || null,
        updatedAt: new Date().toISOString(),
    };
    records.set(String(input.orderId), record);
    if (result.confirmationId) {
        records.set(String(result.confirmationId), record);
    }
    return record;
}

function fromWebhookLedger(id) {
    const order = webhookService.getOrderStatus(id);
    if (!order) return null;
    const confirmed = order.status === "unlocked";
    return {
        status: confirmed ? "confirmed" : "pending",
        payment: confirmed
            ? {
                  id,
                  planName: "Course",
                  amount: 0,
                  currency: "INR",
                  transactionId: order.eventId || id,
                  paidAt: order.unlockedAt || new Date().toISOString(),
                  courseId: "",
                  failureReason: undefined,
              }
            : undefined,
        failureCode: null,
        updatedAt: new Date().toISOString(),
    };
}

function getStatus(id) {
    const record = records.get(String(id)) || fromWebhookLedger(String(id));
    if (!record) {
        return null;
    }
    return { status: record.status, payment: record.payment, failureCode: record.failureCode };
}

function resetForTests() {
    records.clear();
}

module.exports = { recordConfirmation, getStatus, resetForTests };
