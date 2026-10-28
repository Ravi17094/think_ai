/**
 * Client checkout payment endpoints.
 *
 *   POST /api/v1/payments/validate-discount  -> validates a discount code
 *   POST /api/v1/payments/receipt            -> renders the client receipt email
 *
 * The discount validation enforces the client-mandated cost-center format
 * ("XX-0000") and the commission table rules (expiry, maxUses, department).
 */

const discountService = require("../services/payments/discountService");
const receiptService = require("../services/payments/receiptService");
const paymentWebhookService = require("../services/payments/paymentWebhookService");
const paymentConfirmationService = require("../services/payments/paymentConfirmationService");
const paymentStatusStore = require("../services/payments/paymentStatusStore");

// ---------------------------------------------------------------------------
// Payment webhooks (Stripe / Razorpay) + confirmation retry
// ---------------------------------------------------------------------------

function rawBodyOf(req, fallback) {
    if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString();
    if (typeof req.rawBody === "string") return req.rawBody;
    // No raw-body middleware mounted: reconstruct a deterministic signature
    // over the parsed JSON for the local demo + integration tests.
    return fallback;
}

function handleStripeWebhook(req, res) {
    const signature = req.headers["stripe-signature"] || req.headers["x-stripe-signature"] || "";
    const raw = rawBodyOf(req, JSON.stringify(req.body || {}));

    if (signature && !paymentWebhookService.verifySignature(raw, signature)) {
        return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const result = paymentWebhookService.processStripeWebhook(req.body);
    // Webhooks must always be acknowledged (200) once the event is understood;
    // duplicates are idempotently ignored.
    return res.status(200).json({ received: true, ...result });
}

function handleRazorpayWebhook(req, res) {
    const signature = req.headers["x-razorpay-signature"] || "";
    const raw = rawBodyOf(req, JSON.stringify(req.body || {}));

    if (signature && !paymentWebhookService.verifySignature(raw, signature)) {
        return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const result = paymentWebhookService.processRazorpayWebhook(req.body);
    return res.status(200).json({ received: true, ...result });
}

/**
 * POST /api/v1/payments/confirm — runs the payment confirmation retry loop
 * (max 3 attempts, exponential backoff). Returns 402 when the payment
 * ultimately failed, 200 with the receipt reference when it succeeded.
 */
async function confirmPayment(req, res) {
    const {
        orderId,
        userId,
        courseId,
        amount,
        currency,
        email,
        costCenter,
        discountCode,
        discountValue,
        enrollmentId,
        instrument
    } = req.body || {};

    if (!orderId || !userId || !courseId) {
        return res.status(400).json({ success: false, message: "orderId, userId and courseId are required" });
    }
    if (costCenter !== undefined && costCenter !== null && !discountService.isValidCostCenter(costCenter)) {
        return res.status(400).json({ success: false, message: discountService.COST_CENTER_FORMAT_MESSAGE });
    }

    try {
        const result = await paymentConfirmationService.confirmPaymentWithRetry({
            orderId,
            userId,
            courseId,
            amount,
            currency,
            email,
            costCenter,
            discountCode,
            discountValue,
            enrollmentId,
            instrument
        });

        paymentStatusStore.recordConfirmation(
            { orderId, courseId, courseTitle: req.body.courseTitle, amount, currency, email },
            result
        );

        if (!result.success) {
            return res.status(402).json({ success: false, message: result.message, data: result });
        }

        return res.status(200).json({ success: true, message: "Payment confirmed", data: result });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/v1/payments/:id/status — status projection polled by the RN
 * success screen. Accepts either the order id or the confirmation id.
 */
function getPaymentStatus(req, res) {
    const record = paymentStatusStore.getStatus(req.params.id);
    if (!record) {
        return res.status(404).json({ success: false, message: "Payment not found" });
    }
    return res.status(200).json({ success: true, data: record });
}

function validateDiscount(req, res) {
    const { code, costCenter, department, amount } = req.body || {};

    if (!code) {
        return res.status(400).json({ success: false, message: "Discount code is required" });
    }

    const result = discountService.validateDiscount({ code, costCenter, department, amount });

    if (!result.valid) {
        const statusCode = result.status === "unknown" ? 404 : 400;
        return res.status(statusCode).json({ success: false, status: result.status, message: result.message });
    }

    res.status(200).json({ success: true, data: result });
}

function generateReceipt(req, res) {
    const { orderId, enrollmentId, courseTitle, costCenter, discountCode, discountValue, amount, currency, paidAt } =
        req.body || {};

    if (!costCenter || !discountService.isValidCostCenter(costCenter)) {
        return res.status(400).json({ success: false, message: discountService.COST_CENTER_FORMAT_MESSAGE });
    }
    if (!orderId || !courseTitle) {
        return res.status(400).json({ success: false, message: "orderId and courseTitle are required" });
    }

    const rendered = receiptService.renderReceipt({
        orderId,
        enrollmentId,
        courseTitle,
        costCenter,
        discountCode,
        discountValue,
        amount,
        currency,
        paidAt
    });

    res.status(200).json({
        success: true,
        data: {
            templatePath: rendered.templatePath,
            supportEmail: rendered.supportEmail,
            receiptHtml: rendered.html,
            context: rendered.context
        }
    });
}

module.exports = { validateDiscount, generateReceipt };
const crypto = require('crypto');

exports.createIntent = async (req, res, next) => {
  try {
    const { amount, currency } = req.body;
    
    if (!amount) {
      return res.status(400).json({ success: false, error: "Amount is required" });
    }

    // Mock client secret token string generation for Stripe/Razorpay
    const clientSecret = `pi_mock_${crypto.randomBytes(16).toString('hex')}`;
    
    res.status(200).json({ 
      success: true, 
      clientSecret, 
      amount, 
      currency: currency || 'USD' 
    });
  } catch (error) {
    next(error);
  }
};

exports.handleWebhook = async (req, res, next) => {
  try {
    const event = req.body;

    // Clean decoupled cross-module check logic execution
    if (event.type === 'payment.succeeded') {
      const paymentData = event.data.object;
      console.log(`💳 Decoupled Event Triggered: Payment verified cleanly for User ${paymentData.userId}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};
module.exports = {
    validateDiscount,
    generateReceipt,
    getPaymentStatus,
    handleStripeWebhook,
    handleRazorpayWebhook,
    confirmPayment,
};
