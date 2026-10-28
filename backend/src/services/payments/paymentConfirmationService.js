// ============================================================
// Checkout Edge Cases — payment confirmation with retry + backoff
// ============================================================
// Runs the client-mandated payment confirmation logic:
//   1. Up to MAX_RETRIES (3) confirmation attempts.
//   2. Exponential backoff between attempts: 1s -> 2s -> 4s.
//   3. Distinct customer-facing messages for declined / insufficient funds /
//      expired-card failures (client test-card scenarios).
//   4. Receipt generated + emailed once payment eventually succeeds.
//
// The gateway is injectable so tests exercise the full retry lifecycle
// without a live Stripe/Razorpay connection.
// ============================================================

const receiptService = require("./receiptService");
const notificationQueue = require("../../../services/notificationQueueService");
const webhookService = require("./paymentWebhookService");

const MAX_RETRIES = 3;

// Exponential backoff (ms): attempt 1 waits 1s, attempt 2 waits 2s.
// (There is no wait after the final attempt.)
const BACKOFF_DELAYS = [1000, 2000, 4000];

const FAILURE_CODES = {
    CARD_DECLINED: "card_declined",
    INSUFFICIENT_FUNDS: "insufficient_funds",
    EXPIRED_CARD: "expired_card",
    PROCESSING_ERROR: "processing_error",
    TIMEOUT: "timeout",
};

const FAILURE_MESSAGES = {
    [FAILURE_CODES.CARD_DECLINED]: "Your card was declined. Please try a different card or contact your bank.",
    [FAILURE_CODES.INSUFFICIENT_FUNDS]: "Your card has insufficient funds. Please add funds and retry, or use another card.",
    [FAILURE_CODES.EXPIRED_CARD]: "Your card has expired. Please use a valid card.",
    [FAILURE_CODES.PROCESSING_ERROR]: "We could not process your payment right now. Please retry in a moment.",
    [FAILURE_CODES.TIMEOUT]: "The payment gateway did not respond in time. Please retry.",
};

// Transient failures can recover on a later attempt; hard failures cannot.
const TRANSIENT_CODES = new Set([
    FAILURE_CODES.INSUFFICIENT_FUNDS,
    FAILURE_CODES.PROCESSING_ERROR,
    FAILURE_CODES.TIMEOUT,
]);

// ---------------------------------------------------------------------------
// Test-card / test-instrument mapping (client payment test instruments)
// ---------------------------------------------------------------------------

const TEST_CARDS = {
    // Stripe
    "4242424242424242": { outcome: "succeeded" },
    "4000000000000002": { outcome: "declined", failureCode: FAILURE_CODES.CARD_DECLINED },
    "4000000000009995": { outcome: "failed", failureCode: FAILURE_CODES.INSUFFICIENT_FUNDS },
    "4000000000000069": { outcome: "failed", failureCode: FAILURE_CODES.EXPIRED_CARD },
    "4000000000000009": { outcome: "failed", failureCode: FAILURE_CODES.PROCESSING_ERROR },
    "4000000000000029": { outcome: "failed", failureCode: FAILURE_CODES.PROCESSING_ERROR },
    // Razorpay
    "4111111111111111": { outcome: "succeeded" },
    "4000000000000002": { outcome: "declined", failureCode: FAILURE_CODES.CARD_DECLINED },
};

const TEST_INSTRUMENTS = {
    success: { outcome: "succeeded" },
    declined: { outcome: "declined", failureCode: FAILURE_CODES.CARD_DECLINED },
    "insufficient-funds": { outcome: "failed", failureCode: FAILURE_CODES.INSUFFICIENT_FUNDS },
    "expired-card": { outcome: "failed", failureCode: FAILURE_CODES.EXPIRED_CARD },
    "network-error": { outcome: "failed", failureCode: FAILURE_CODES.PROCESSING_ERROR },
    timeout: { outcome: "failed", failureCode: FAILURE_CODES.TIMEOUT },
};

/**
 * Mapping from a raw input (test instrument id or card number) to a gateway
 * outcome descriptor. Defaults to success for unknown instruments.
 */
function resolveTestCard(instrumentOrNumber) {
    const key = String(instrumentOrNumber || "").trim();
    return TEST_CARDS[key] || TEST_INSTRUMENTS[key] || { outcome: "succeeded" };
}

// ---------------------------------------------------------------------------
// Default gateway simulation (dev/test; swap for Stripe/Razorpay SDK calls)
// ---------------------------------------------------------------------------

/**
 * Simulated gateway. `options.flakyFirstAttempts` fails the first N attempts
 * with a transient error so tests can prove retry+backoff+receipt recovery.
 */
function createSimulatedGateway(options = {}) {
    let calls = 0;
    return {
        name: "simulated",
        calls: () => calls,
        async confirm({ instrument, attempt }) {
            calls += 1;
            const descriptor = resolveTestCard(instrument);

            if (options.flakyFirstAttempts && calls <= options.flakyFirstAttempts) {
                return { status: "failed", failureCode: FAILURE_CODES.PROCESSING_ERROR, attempt, transient: true };
            }
            if (descriptor.outcome === "succeeded") {
                return { status: "succeeded", confirmationId: `conf-${calls}-${Date.now()}`, attempt };
            }
            return {
                status: "failed",
                failureCode: descriptor.failureCode || FAILURE_CODES.CARD_DECLINED,
                transient: TRANSIENT_CODES.has(descriptor.failureCode || ""),
                attempt,
            };
        },
    };
}

// ---------------------------------------------------------------------------
// Receipt after successful payment
// ---------------------------------------------------------------------------

/**
 * Renders + enqueues the payment receipt email. Returns the enqueued job
 * (the notification queue retries delivery up to 3× with backoff).
 */
function enqueueReceiptReceipt(receipt) {
    const rendered = receiptService.renderReceipt(receipt);
    return notificationQueue.enqueue({
        type: "payment-receipt",
        userId: receipt.userId,
        subject: `Payment receipt — ${receipt.orderId}`,
        text: rendered.context ? `Receipt for ${receipt.courseTitle || "your course"} (${receipt.orderId}).` : "",
        html: rendered.html,
        to: receipt.email,
        meta: { orderId: receipt.orderId, enrollmentId: receipt.enrollmentId },
    });
}

// ---------------------------------------------------------------------------
// Retry loop
// ---------------------------------------------------------------------------

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Confirms a payment with at most MAX_RETRIES attempts and exponential
 * backoff. On success the enrollment is unlocked atomically and a receipt is
 * enqueued. Resolves with the full attempt log for audit + tests.
 */
async function confirmPaymentWithRetry(
    { userId, courseId, orderId, amount, currency = "₹", email, costCenter, discountCode, discountValue, enrollmentId, instrument },
    { gateway = createSimulatedGateway(), delay = sleep, getDelayFor = (attemptIndex) => BACKOFF_DELAYS[attemptIndex] } = {}
) {
    if (!orderId) {
        throw new Error("orderId is required");
    }

    const attempts = [];
    let lastFailureCode = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
        const outcome = await gateway.confirm({ instrument, attempt, orderId });
        const recorded = {
            attempt,
            status: outcome.status,
            failureCode: outcome.failureCode || null,
            transient: Boolean(outcome.transient),
            confirmationId: outcome.confirmationId || null,
            startedAt: new Date().toISOString(),
        };
        attempts.push(recorded);

        if (outcome.status === "succeeded") {
            const unlock = webhookService.unlockEnrollment({
                userId,
                courseId,
                orderId,
                eventId: `confirm:${orderId}:${Date.now()}`,
                provider: "checkout-session",
            });

            let receiptJob = null;
            if (enrollmentId !== undefined || costCenter || email) {
                receiptJob = enqueueReceiptReceipt({
                    orderId,
                    enrollmentId: enrollmentId || unlock.enrollment.id,
                    courseTitle: outcome.courseTitle || "Course enrollment",
                    costCenter,
                    discountCode,
                    discountValue,
                    amount,
                    currency,
                    paidAt: new Date().toISOString(),
                    userId,
                    email,
                });
            }

            return {
                success: true,
                orderId,
                attempts,
                attemptsUsed: attempt,
                confirmationId: outcome.confirmationId,
                enrollmentUnlocked: unlock.enrollment.status === webhookService.ENROLLMENT_STATUS.UNLOCKED,
                receiptJob: receiptJob ? { id: receiptJob.id, type: receiptJob.type } : null,
            };
        }

        lastFailureCode = outcome.failureCode || FAILURE_CODES.PROCESSING_ERROR;

        // Hard, non-recoverable failures break the retry loop immediately.
        if (!outcome.transient) {
            return {
                success: false,
                orderId,
                attempts,
                attemptsUsed: attempt,
                retryable: false,
                failureCode: lastFailureCode,
                message: FAILURE_MESSAGES[lastFailureCode] || FAILURE_MESSAGES[FAILURE_CODES.PROCESSING_ERROR],
            };
        }

        const backoffMs = getDelayFor(attempt - 1);
        recorded.backoffMs = backoffMs;
        if (attempt < MAX_RETRIES) {
            await delay(backoffMs);
        }
    }

    return {
        success: false,
        orderId,
        attempts,
        attemptsUsed: MAX_RETRIES,
        retryable: true,
        failureCode: lastFailureCode,
        message: FAILURE_MESSAGES[lastFailureCode] || FAILURE_MESSAGES[FAILURE_CODES.PROCESSING_ERROR],
        retriesExhausted: true,
    };
}

// Aliases kept for the canonical naming used by the checklist.
const confirmPayment = confirmPaymentWithRetry;

module.exports = {
    MAX_RETRIES,
    BACKOFF_DELAYS,
    FAILURE_CODES,
    FAILURE_MESSAGES,
    TEST_CARDS,
    TEST_INSTRUMENTS,
    createSimulatedGateway,
    resolveTestCard,
    confirmPaymentWithRetry,
    confirmPayment,
    enqueueReceiptReceipt,
    sleep,
};