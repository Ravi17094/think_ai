// ============================================================
// Checkout Edge Cases — idempotent payment webhooks
// ============================================================
// Stripe + Razorpay webhook ingestion with:
//   1. Idempotency keying on the payment-event id — duplicate deliveries
//      (Stripe/Razorpay retry webhooks) are acknowledged but processed once.
//   2. Atomic enrollment unlock — a user can be unlocked for a course exactly
//      once, even when two different webhook deliveries race into the same
//      process tick (the check-then-set guard runs in a single synchronous
//      section on Node's event loop, mirroring a UNIQUE constraint).
//
// Storage is an in-memory payment ledger. In production this maps to the
// payments/enrollments tables where the unlock is a single guarded UPDATE
// (`WHERE unlocked = false`) with the event id stored as a unique natural key.
// ============================================================

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// In-memory payment ledger (idempotency store)
// ---------------------------------------------------------------------------

const ledger = {
    /** Set of payment event ids already processed (idempotency key). */
    processedEvents: new Set(),
    /** `${userId}:${courseId}` -> enrollment record (unlocked exactly once). */
    enrollments: new Map(),
    /** orderId -> order record with status + provenance. */
    orders: new Map(),
    /** Ordered audit trail of processed webhook calls. */
    calls: [],
};

const ENROLLMENT_STATUS = {
    LOCKED: "locked",
    UNLOCKED: "unlocked",
};

function resetLedgerForTests() {
    ledger.processedEvents.clear();
    ledger.enrollments.clear();
    ledger.orders.clear();
    ledger.calls.length = 0;
}

function enrollmentKey(userId, courseId) {
    return `${userId}:${courseId}`;
}

function recordCall({ provider, eventId, orderId, userId, courseId, duplicate, outcome }) {
    ledger.calls.push({ provider, eventId, orderId, userId, courseId, duplicate, outcome, at: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Enrollment lifecycle (atomic guard)
// ---------------------------------------------------------------------------

/**
 * Marks an enrollment as locked at order creation. Idempotent: returns the
 * existing record when the key already exists.
 */
function lockEnrollmentForOrder({ userId, courseId, orderId }) {
    const key = enrollmentKey(userId, courseId);
    if (!ledger.enrollments.has(key)) {
        ledger.enrollments.set(key, {
            userId,
            courseId,
            orderId,
            status: ENROLLMENT_STATUS.LOCKED,
            unlockedAt: null,
            eventId: null,
            provider: null,
        });
    }
    const enrollment = ledger.enrollments.get(key);
    if (ledger.orders.get(orderId)?.status === ENROLLMENT_STATUS.UNLOCKED) {
        // Already unlocked via this or another event — keep it consistent.
        enrollment.status = ENROLLMENT_STATUS.UNLOCKED;
    }
    return enrollment;
}

/**
 * Atomically unlocks an enrollment. The synchronous guard is the exact
 * equivalent of `UPDATE enrollments SET unlocked = true WHERE userId = $1 AND
 * courseId = $2 AND unlocked = false RETURNING *` — safe against duplicate
 * webhook races. Returns `{ unlocked: boolean, enrollment, wasAlreadyUnlocked }`.
 */
function unlockEnrollment({ userId, courseId, orderId, eventId, provider }) {
    const existing = ledger.enrollments.get(enrollmentKey(userId, courseId));
    const enrollment = existing || lockEnrollmentForOrder({ userId, courseId, orderId });

    if (enrollment.status === ENROLLMENT_STATUS.UNLOCKED) {
        return { unlocked: false, wasAlreadyUnlocked: true, enrollment };
    }

    // --- atomic check-then-set (single synchronous section) --------------
    enrollment.status = ENROLLMENT_STATUS.UNLOCKED;
    enrollment.unlockedAt = new Date().toISOString();
    enrollment.eventId = eventId || enrollment.eventId;
    enrollment.provider = provider || enrollment.provider;

    const order = ledger.orders.get(orderId) || { orderId, createdAt: new Date().toISOString() };
    order.status = ENROLLMENT_STATUS.UNLOCKED;
    order.unlockedAt = enrollment.unlockedAt;
    order.eventId = enrollment.eventId;
    ledger.orders.set(orderId, order);

    return { unlocked: true, wasAlreadyUnlocked: false, enrollment };
}

// ---------------------------------------------------------------------------
// Idempotency keying
// ---------------------------------------------------------------------------

function isEventProcessed(eventId) {
    return ledger.processedEvents.has(String(eventId));
}

function markEventProcessed(eventId, meta = {}) {
    ledger.processedEvents.add(String(eventId));
    ledger.calls.push({ eventId: String(eventId), ...meta, at: new Date().toISOString() });
    return true;
}

// ---------------------------------------------------------------------------
// Provider normalization + processing
// ---------------------------------------------------------------------------

/** Normalizes a Stripe webhook payload into a canonical payment event. */
function normalizeStripeWebhook(body) {
    const event = body?.event || body?.data?.object || body;
    const type = event.type || body.type || "";
    const object = event.data?.object || body.data?.object || {};

    const metadata = object.metadata || {};
    const eventId = event.id || body.eventId || body.event_id;
    const orderId = metadata.orderId || metadata.order_id || object.orderId || "";
    const userId = metadata.userId || metadata.user_id || "";
    const courseId = metadata.courseId || metadata.course_id || "";
    const amount = object.amount_total !== undefined
        ? object.amount_total
        : object.amount_received !== undefined
            ? object.amount_received
            : Number(object.amount || 0);
    const currency = object.currency || "inr";

    const successType = type === "checkout.session.completed" || type === "payment_intent.succeeded";

    return { provider: "stripe", eventId, type, orderId, userId, courseId, amount, currency, successType };
}

/** Normalizes a Razorpay webhook payload into a canonical payment event. */
function normalizeRazorpayWebhook(body) {
    const payload = body?.payload || body;
    const eventId = payload?.payment?.entity?.id || body.event_id || body.eventId || "";
    const orderId = payload?.payment?.entity?.order_id || body?.order_id || "";
    const amount = payload?.payment?.entity?.amount || Number(body.amount || 0);
    const currency = payload?.payment?.entity?.currency || "inr";
    const notes = payload?.payment?.entity?.notes || body.notes || {};
    const userId = notes.userId || notes.user_id || "";
    const courseId = notes.courseId || notes.course_id || "";
    const type = body.event || (eventId ? "payment.captured" : "");

    const successType = type === "payment.captured" || type === "order.paid";

    return { provider: "razorpay", eventId, type, orderId, userId, courseId, amount, currency, successType };
}

/** Canonical handler shared by both providers. Idempotent end-to-end. */
function processPaymentWebhook(providerBody, provider) {
    const normalized = provider === "razorpay"
        ? normalizeRazorpayWebhook(providerBody)
        : normalizeStripeWebhook(providerBody);

    if (!normalized.eventId || !normalized.courseId || !normalized.userId) {
        recordCall({ provider, ...normalized, duplicate: false, outcome: "invalid-payload" });
        return { success: false, status: "invalid-payload", normalized };
    }

    if (isEventProcessed(normalized.eventId)) {
        const enrollment = ledger.enrollments.get(enrollmentKey(normalized.userId, normalized.courseId)) || null;
        recordCall({ provider, ...normalized, duplicate: true, outcome: "already-processed" });
        return {
            success: false,
            idempotent: true,
            duplicate: true,
            message: "Duplicate webhook — event already processed",
            normalized,
            enrollment,
        };
    }

    // Idempotency key is claimed BEFORE the enrollments write (race-safe).
    markEventProcessed(normalized.eventId, { provider, orderId: normalized.orderId, outcome: normalized.successType ? "processed" : "ignored" });

    if (!normalized.successType) {
        return { success: false, idempotent: true, status: "ignored", normalized };
    }

    const unlock = unlockEnrollment({
        userId: normalized.userId,
        courseId: normalized.courseId,
        orderId: normalized.orderId,
        eventId: normalized.eventId,
        provider: normalized.provider,
    });

    recordCall({ provider, ...normalized, duplicate: false, outcome: "unlocked" });

    return {
        success: true,
        idempotent: true,
        duplicate: false,
        wasAlreadyUnlocked: unlock.wasAlreadyUnlocked,
        enrollment: unlock.enrollment,
        order: ledger.orders.get(normalized.orderId) || null,
        normalized,
    };
}

function processStripeWebhook(body) {
    return processPaymentWebhook(body, "stripe");
}

function processRazorpayWebhook(body) {
    return processPaymentWebhook(body, "razorpay");
}

// ---------------------------------------------------------------------------
// Status + introspection (polling / tests)
// ---------------------------------------------------------------------------

function getEnrollment(userId, courseId) {
    return ledger.enrollments.get(enrollmentKey(userId, courseId)) || null;
}

function getOrderStatus(orderId) {
    return ledger.orders.get(orderId) || null;
}

function getLedgerSnapshot() {
    return {
        processedEvents: [...ledger.processedEvents],
        enrollments: [...ledger.enrollments.values()],
        orders: [...ledger.orders.values()],
        calls: [...ledger.calls],
    };
}

// ---------------------------------------------------------------------------
// Signature verification (demo stand-in for stripe-strategy / razorpay-strategy)
// ---------------------------------------------------------------------------

const TEST_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "whsec_test_client_demo";

/**
 * Verifies an HMAC-SHA256 signature over the raw request body. Real
 * deployments use `stripe.webhooks.constructEvent` / razorpay's verifier;
 * this keeps the local demo + integration tests self-contained.
 */
function verifySignature(rawBody, signatureHeader, secret = TEST_WEBHOOK_SECRET) {
    if (!signatureHeader || !secret) return false;
    const candidate = signatureHeader
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.startsWith("v1=") || part.includes("v1="))
        .map((part) => part.replace(/^v1=/, ""))
        .find(() => true);

    const expected = crypto.createHmac("sha256", secret).update(rawBody || "").digest("hex");
    const provided = candidate || "";
    return expected.length === provided.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function signPayload(rawBody, secret = TEST_WEBHOOK_SECRET) {
    return `t=${Math.floor(Date.now() / 1000)},v1=${crypto.createHmac("sha256", secret).update(rawBody || "").digest("hex")}`;
}

module.exports = {
    ledger,
    ENROLLMENT_STATUS,
    resetLedgerForTests,
    lockEnrollmentForOrder,
    unlockEnrollment,
    isEventProcessed,
    markEventProcessed,
    normalizeStripeWebhook,
    normalizeRazorpayWebhook,
    processStripeWebhook,
    processRazorpayWebhook,
    processPaymentWebhook,
    getEnrollment,
    getOrderStatus,
    getLedgerSnapshot,
    TEST_WEBHOOK_SECRET,
    verifySignature,
    signPayload,
};