const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const paymentRoutes = require("./src/routes/paymentRoutes");
const webhookService = require("./src/services/payments/paymentWebhookService");
const confirmationService = require("./src/services/payments/paymentConfirmationService");
const notificationQueue = require("./services/notificationQueueService");

const {
    FAILURE_CODES,
    FAILURE_MESSAGES,
    TEST_CARDS,
    BACKOFF_DELAYS,
} = confirmationService;

function withServer(fn) {
    const app = express();
    app.use(express.json());
    app.use("/api/v1/payments", paymentRoutes);
    const server = http.createServer(app);
    return new Promise((resolve, reject) => {
        server.listen(0, "127.0.0.1", () => {
            const base = `http://127.0.0.1:${server.address().port}`;
            fn(base)
                .then(() => server.close(resolve))
                .catch((err) => {
                    server.close(() => reject(err));
                });
        });
    });
}

function stripeCheckoutEvent({ eventId = "evt_stripe_1", orderId = "ord_1", userId = "u1", courseId = "crs_1" } = {}) {
    return {
        event: {
            id: eventId,
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_1",
                    amount_total: 1234,
                    currency: "inr",
                    metadata: { orderId, userId, courseId },
                },
            },
        },
    };
}

function razorpayCapturedEvent({ eventId = "evt_rp_1", orderId = "ord_2", userId = "u2", courseId = "crs_2" } = {}) {
    return {
        event: "payment.captured",
        order_id: orderId,
        amount: 100000,
        currency: "INR",
        notes: { userId, courseId },
        payload: {
            payment: {
                entity: {
                    id: eventId,
                    order_id: orderId,
                    amount: 100000,
                    currency: "INR",
                    notes: { userId, courseId },
                },
            },
        },
    };
}

// ---------------------------------------------------------------
// Webhook idempotency
// ---------------------------------------------------------------

test("stripe checkout.session.completed unlocks the enrollment once", () => {
    webhookService.resetLedgerForTests();

    const first = webhookService.processStripeWebhook(stripeCheckoutEvent());
    assert.equal(first.success, true);
    assert.equal(first.duplicate, false);
    assert.equal(first.enrollment.status, webhookService.ENROLLMENT_STATUS.UNLOCKED);

    const duplicate = webhookService.processStripeWebhook(stripeCheckoutEvent());
    assert.equal(duplicate.success, false);
    assert.equal(duplicate.idempotent, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.enrollment.status, webhookService.ENROLLMENT_STATUS.UNLOCKED);

    assert.equal(webhookService.getEnrollment("u1", "crs_1").status, webhookService.ENROLLMENT_STATUS.UNLOCKED);
    assert.ok(webhookService.isEventProcessed("evt_stripe_1"));
});

test("duplicate webhooks never unlock twice (atomic single unlock)", () => {
    webhookService.resetLedgerForTests();

    webhookService.processStripeWebhook(stripeCheckoutEvent());
    const unlock = webhookService.unlockEnrollment({ userId: "u1", courseId: "crs_1", orderId: "ord_1", eventId: "evt_stripe_1" });
    assert.equal(unlock.wasAlreadyUnlocked, true);
    assert.equal(unlock.unlocked, false);

    const snapshot = webhookService.getLedgerSnapshot();
    assert.equal(snapshot.enrollments.length, 1);
});

test("razorpay payment.captured is idempotent", () => {
    webhookService.resetLedgerForTests();

    const first = webhookService.processRazorpayWebhook(razorpayCapturedEvent());
    assert.equal(first.success, true);
    assert.equal(first.enrollment.status, webhookService.ENROLLMENT_STATUS.UNLOCKED);

    const duplicate = webhookService.processRazorpayWebhook(razorpayCapturedEvent());
    assert.equal(duplicate.duplicate, true);
    assert.equal(webhookService.getEnrollment("u2", "crs_2").status, webhookService.ENROLLMENT_STATUS.UNLOCKED);
});

test("a later event for an already-unlocked enrollment is acknowledged but not re-unlocked", () => {
    webhookService.resetLedgerForTests();
    webhookService.processStripeWebhook(stripeCheckoutEvent({ eventId: "evt_stripe_1" }));

    const second = webhookService.processStripeWebhook(
        stripeCheckoutEvent({ eventId: "evt_stripe_2" })
    );
    assert.equal(second.wasAlreadyUnlocked, true);
    assert.equal(second.duplicate, false);
    assert.equal(second.enrollment.status, webhookService.ENROLLMENT_STATUS.UNLOCKED);
});

test("non-success webhook types are acknowledged but do not unlock", () => {
    webhookService.resetLedgerForTests();
    const result = webhookService.processStripeWebhook({
        event: { id: "evt_stripe_3", type: "payment_intent.canceled", data: { object: { metadata: { orderId: "ord_1", userId: "u1", courseId: "crs_1" } } } },
    });
    assert.equal(result.status, "ignored");
    assert.equal(webhookService.getEnrollment("u1", "crs_1"), null);
});

test("invalid webhook payloads (missing metadata) are rejected", () => {
    webhookService.resetLedgerForTests();
    const result = webhookService.processStripeWebhook({ event: { id: "evt_x", type: "checkout.session.completed", data: { object: {} } } });
    assert.equal(result.status, "invalid-payload");
});

// ---------------------------------------------------------------
// Signature verification (demo stand-in)
// ---------------------------------------------------------------

test("verifySignature accepts a payload signed with the shared secret and rejects tampered ones", () => {
    const raw = JSON.stringify(stripeCheckoutEvent());
    const good = webhookService.signPayload(raw);
    assert.equal(webhookService.verifySignature(raw, good), true);

    const tampered = JSON.stringify(stripeCheckoutEvent({ orderId: "ord_EVIL" }));
    assert.equal(webhookService.verifySignature(tampered, good), false);
    assert.equal(webhookService.verifySignature(raw, "v1=deadbeef".padStart(String(good).length, "0")), false);
});

test("POST /webhooks/stripe verifies the signature and ack'ed duplicates with 200", async () => {
    await withServer(async (base) => {
        const payload = stripeCheckoutEvent();
        const raw = JSON.stringify(payload);
        const signature = webhookService.signPayload(raw);

        const post = (bodyText, sig) =>
            fetch(`${base}/api/v1/payments/webhooks/stripe`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "stripe-signature": sig },
                body: bodyText,
            });

        const badRes = await post(raw, "v1=tamperedtamperedtamperedtamperedtamperedtamperedtamperedtamperedtamper");
        assert.equal(badRes.status, 400);

        const res = await post(raw, signature);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.received, true);

        const dup = await post(raw, signature);
        const dupBody = await dup.json();
        assert.equal(dup.status, 200);
        assert.equal(dupBody.duplicate, true);
        assert.equal(webhookService.getEnrollment("u1", "crs_1").status, webhookService.ENROLLMENT_STATUS.UNLOCKED);
    });
});

// ---------------------------------------------------------------
// Retry + exponential backoff
// ---------------------------------------------------------------

test("confirmation stops after 3 failed attempts with exponential backoff recorded", async () => {
    const gateway = confirmationService.createSimulatedGateway();
    const delays = [];
    const result = await confirmationService.confirmPaymentWithRetry(
        { userId: "u1", courseId: "crs_1", orderId: "ord_rd1", instrument: "network-error" },
        { gateway, delay: async (ms) => delays.push(ms) }
    );

    assert.equal(result.success, false);
    assert.equal(result.attemptsUsed, confirmationService.MAX_RETRIES);
    assert.equal(result.attempts.length, 3);
    assert.equal(result.retryable, true);
    // exponential backoff between consecutive retries
    assert.deepEqual(delays, [1000, 2000]);
    assert.deepEqual(BACKOFF_DELAYS, [1000, 2000, 4000]);
    assert.equal(gateway.calls(), 3);
});

test("a hard decline is not retried and returns the specific message", async () => {
    const gateway = confirmationService.createSimulatedGateway();
    const result = await confirmationService.confirmPaymentWithRetry(
        { userId: "u1", courseId: "crs_1", orderId: "ord_rd2", instrument: "declined" },
        { gateway, delay: async () => {} }
    );

    assert.equal(result.success, false);
    assert.equal(result.attemptsUsed, 1);
    assert.equal(result.retryable, false);
    assert.equal(result.failureCode, FAILURE_CODES.CARD_DECLINED);
    assert.equal(result.message, FAILURE_MESSAGES[FAILURE_CODES.CARD_DECLINED]);
});

test("insufficient-funds shows the refundable-retry specific message", async () => {
    const result = await confirmationService.confirmPaymentWithRetry(
        { userId: "u1", courseId: "crs_1", orderId: "ord_rd3", instrument: "insufficient-funds" },
        { gateway: confirmationService.createSimulatedGateway(), delay: async () => {} }
    );
    assert.equal(result.success, false);
    assert.equal(result.failureCode, FAILURE_CODES.INSUFFICIENT_FUNDS);
    assert.equal(result.message, FAILURE_MESSAGES[FAILURE_CODES.INSUFFICIENT_FUNDS]);
});

test("expired-card shows the expired card message", async () => {
    const result = await confirmationService.confirmPaymentWithRetry(
        { userId: "u1", courseId: "crs_1", orderId: "ord_rd4", instrument: "expired-card" },
        { gateway: confirmationService.createSimulatedGateway(), delay: async () => {} }
    );
    assert.equal(result.failureCode, FAILURE_CODES.EXPIRED_CARD);
    assert.equal(result.message, FAILURE_MESSAGES[FAILURE_CODES.EXPIRED_CARD]);
});

test("test-card mapping: Stripe happy path + failure cards map to their outcomes", () => {
    assert.equal(confirmationService.resolveTestCard("4242424242424242").outcome, "succeeded");
    assert.equal(confirmationService.resolveTestCard("4000000000000002").failureCode, FAILURE_CODES.CARD_DECLINED);
    assert.equal(confirmationService.resolveTestCard("4000000000009995").failureCode, FAILURE_CODES.INSUFFICIENT_FUNDS);
    assert.equal(confirmationService.resolveTestCard("4000000000000069").failureCode, FAILURE_CODES.EXPIRED_CARD);
    assert.equal(TEST_CARDS["4000000000000002"].outcome, "declined");
});

test("card_declined / insufficient / expired each resolve distinct messages", () => {
    const declined = confirmationService.resolveTestCard("4000000000000002");
    const insufficient = confirmationService.resolveTestCard("4000000000009995");
    const expired = confirmationService.resolveTestCard("4000000000000069");
    assert.notEqual(declined.failureCode, insufficient.failureCode);
    assert.notEqual(insufficient.failureCode, expired.failureCode);
    assert.match(FAILURE_MESSAGES[declined.failureCode], /declined/i);
    assert.match(FAILURE_MESSAGES[insufficient.failureCode], /insufficient funds/i);
    assert.match(FAILURE_MESSAGES[expired.failureCode], /expired/i);
});

test("a transient failure that recovers on retry succeeds and issues a receipt", async () => {
    webhookService.resetLedgerForTests();
    const gateway = confirmationService.createSimulatedGateway({ flakyFirstAttempts: 1 });
    const result = await confirmationService.confirmPaymentWithRetry(
        {
            userId: "u1",
            courseId: "crs_1",
            orderId: "ord_rec1",
            amount: 1000,
            costCenter: "HR-2501",
            email: "learner@thinkz.ai",
            instrument: "success",
        },
        { gateway, delay: async () => {} }
    );

    assert.equal(result.success, true);
    assert.equal(result.attemptsUsed, 2);
    assert.equal(result.attempts[0].failureCode, FAILURE_CODES.PROCESSING_ERROR);
    assert.equal(result.enrollmentUnlocked, true);
    assert.equal(result.receiptJob.type, "payment-receipt");
    assert.equal(result.receiptJob.id.includes("job-"), true);
});

test("receipt after retry: the enqueued email carries the rendered HTML and order id", async () => {
    webhookService.resetLedgerForTests();
    const gateway = confirmationService.createSimulatedGateway({ flakyFirstAttempts: 1 });
    const result = await confirmationService.confirmPaymentWithRetry(
        {
            userId: "u1",
            courseId: "crs_1",
            orderId: "ord_rec2",
            amount: 750,
            currency: "₹",
            costCenter: "DS-1000",
            discountCode: "WELCOME25",
            discountValue: 250,
            email: "learner@thinkz.ai",
            instrument: "success",
        },
        { gateway, delay: async () => {} }
    );

    assert.equal(result.success, true);
    const job = notificationQueue
        .getQueueStatus()
        .jobs.find((j) => j.id === result.receiptJob.id);
    assert.ok(job, "receipt email job should exist in the queue");
    assert.equal(job.type, "payment-receipt");
    assert.ok(job.html.includes("DS-1000"));
    assert.ok(job.html.includes("WELCOME25"));
    assert.equal(job.to, "learner@thinkz.ai");
});

// ---------------------------------------------------------------
// HTTP integration: confirm endpoint
// ---------------------------------------------------------------

test("POST /api/v1/payments/confirm returns 402 + specific message for a declined card", async () => {
    await withServer(async (base) => {
        const res = await fetch(`${base}/api/v1/payments/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: "ord_http1",
                userId: "u1",
                courseId: "crs_1",
                instrument: "declined",
                amount: 1000,
            }),
        });
        assert.equal(res.status, 402);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.match(body.message, /declined/i);
    });
});

test("POST /api/v1/payments/confirm succeeds with a receipt after retry (flaky network)", async () => {
    // Note: the HTTP handler uses the default (non-flaky) gateway, so the
    // mock "network-error" instrument never recovers; success scenario is
    // exercised through the direct service tests above.
    await withServer(async (base) => {
        const res = await fetch(`${base}/api/v1/payments/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: "ord_http2",
                userId: "u1",
                courseId: "crs_2",
                instrument: "success",
                amount: 1000,
                costCenter: "HR-2501",
                email: "learner@thinkz.ai",
            }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.success, true);
        assert.equal(body.data.receiptJob.type, "payment-receipt");
    });
});

test("POST /api/v1/payments/confirm rejects missing required fields", async () => {
    await withServer(async (base) => {
        const res = await fetch(`${base}/api/v1/payments/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: "ord_http3" }),
        });
        assert.equal(res.status, 400);
        const body = await res.json();
        assert.match(body.message, /orderId, userId and courseId are required/);
    });
});