// Checkout & Payment API (mock-first, staging-verified).
//
// ASSUMPTIONS — replace once Pod B's contract is available:
// - POST /api/checkout/create-order  { courseId, amount, currency }  -> { orderId, ... }
// - POST /api/checkout/verify        { orderId, paymentId, signature } -> { success, enrollmentId }
// Flip USE_MOCK to false once real endpoints + payload shapes are confirmed.
//
// The mock layer implements the full Day 13 payment scenario matrix using
// standard Stripe test-card numbers, so the Checkout UI can be validated for
// success, declined-card, network-error and timeout flows without a gateway.

const BASE = "/api/checkout";
const USE_MOCK = true;

/**
 * Discount-code validation is a client customization that speaks to the Forum
 * module's payments endpoint (POST /api/v1/payments/validate-discount) which
 * enforces the cost-center format (XX-0000) and the commission table rules
 * (expiry / maxUses / eligibleDepartments).
 */
const PAYMENTS_API_BASE_URL =
  import.meta.env.VITE_FORUM_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "/api";

/**
 * Validates a discount code at checkout against the client commission table.
 * Resolves with the API payload when the server returns 2xx; otherwise throws
 * an Error carrying the status and server message.
 *
 * @param {{ code: string, costCenter: string, department?: string, amount?: number }} params
 */
export async function validateDiscount({ code, costCenter, department, amount }) {
  const token = localStorage.getItem("token");
  let res;
  try {
    res = await fetch(`${PAYMENTS_API_BASE_URL}/v1/payments/validate-discount`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code, costCenter, department, amount }),
    });
  } catch {
    throw new Error("Network error — discount validation is unavailable right now.");
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const error = new Error((payload && payload.message) || "Discount validation failed.");
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

/**
 * Test payment instruments used by the demo/staging checkout. Each entry maps
 * to a deterministic simulated outcome so the UI can be rehearsed end-to-end.
 */
export const PAYMENT_TEST_INSTRUMENTS = [
  {
    id: "success",
    label: "Successful card",
    instrument: "4242 4242 4242 4242",
    outcome: "success",
    hint: "Payment succeeds and enrollment is created.",
  },
  {
    id: "declined",
    label: "Declined card",
    instrument: "4000 0000 0000 0002",
    outcome: "declined",
    hint: "The bank declines the card (generic decline).",
  },
  {
    id: "insufficient-funds",
    label: "Insufficient funds",
    instrument: "4000 0000 0000 9995",
    outcome: "insufficient-funds",
    hint: "Card has insufficient funds.",
  },
  {
    id: "expired-card",
    label: "Expired card",
    instrument: "4000 0000 0000 0069",
    outcome: "expired-card",
    hint: "The card has expired (Stripe test card).",
  },
  {
    id: "network-error",
    label: "Network error",
    instrument: "4000 0000 0000 0009",
    outcome: "network-error",
    hint: "Simulates a dropped connection mid-verification.",
  },
  {
    id: "timeout",
    label: "Timeout",
    instrument: "4000 0000 0000 0029",
    outcome: "timeout",
    hint: "The gateway never responds within the allowed window.",
  },
];

const FALLBACK_CARD = PAYMENT_TEST_INSTRUMENTS[0].instrument;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCard(number) {
  return String(number || "").replace(/[\s-]/g, "");
}

function compact(html) {
  return String(html || "").replace(/\s+/g, " ").trim();
}

/** Matches a test instrument from a card number or UPI id (case-insensitive). */
export function resolvePaymentInstrument({ method = "card", cardNumber = "", upiId = "" }) {
  const raw = compact(method === "upi" ? upiId : cardNumber).toLowerCase();
  const subject = normalizeCard(raw);
  return (
    PAYMENT_TEST_INSTRUMENTS.find((item) => subject.endsWith(normalizeCard(item.instrument).toLowerCase())) ||
    null
  );
}

async function parseJsonOrThrow(res, fallbackMessage) {
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || !contentType.includes("application/json")) {
    throw new Error(fallbackMessage);
  }
  return res.json();
}

/**
 * Simulated payment outcome used by the mock layer. Readings:
 *   - "success"            -> verifyPayment resolves truthy
 *   - "declined"/"insufficient-funds" -> verifyPayment resolves { success:false, reason }
 *   - "network-error"      -> the network call rejects (like a dropped fetch)
 *   - "timeout"            -> the gateway never answers (rejects after the window)
 */
export function simulatePaymentOutcome(scenario) {
  const outcome = scenario && scenario.outcome ? scenario.outcome : "success";

  switch (outcome) {
    case "declined":
      return {
        success: false,
        reason: "Your card was declined. Please try another card or contact your bank.",
      };
    case "insufficient-funds":
      return {
        success: false,
        reason: "Insufficient funds on the card. Please try another payment method.",
      };
    case "expired-card":
      return {
        success: false,
        reason: "Your card has expired. Please use a card with a valid expiry date.",
      };
    case "network-error": {
      const error = new Error("Network error — connection lost while verifying payment.");
      error.code = "NETWORK_ERROR";
      throw error;
    }
    case "timeout": {
      const error = new Error("Payment verification timed out. Please retry.");
      error.code = "TIMEOUT";
      throw error;
    }
    case "success":
      return {
        success: true,
        enrollmentId: `enr_mock_${Date.now()}`,
      };
    default:
      return { success: true, enrollmentId: `enr_mock_${Date.now()}` };
  }
}

export async function createOrder({ courseId, amount, currency = "INR" }) {
  if (USE_MOCK) {
    await delay(400);
    return {
      orderId: `order_mock_${Date.now()}`,
      courseId,
      amount,
      currency,
    };
  }
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId, amount, currency }),
  });
  return parseJsonOrThrow(res, "Could not create order.");
}

/**
 * Verifies a payment. In mock mode the outcome is driven by the test
 * instrument attached to the order, reproducing the Day 13 scenario matrix:
 * successful payment, declined card, network error and timeout.
 */
export async function verifyPayment({ orderId, paymentId, signature, instrument }) {
  if (USE_MOCK) {
    const timeoutWindow = 8000;
    const instrumentInfo = instrument || { outcome: "success" };

    if (instrumentInfo.outcome === "timeout") {
      await delay(timeoutWindow + 500);
      const error = new Error("Payment verification timed out. Please retry.");
      error.code = "TIMEOUT";
      throw error;
    }

    if (instrumentInfo.outcome === "network-error") {
      await delay(500);
      const error = new Error("Network error — connection lost while verifying payment.");
      error.code = "NETWORK_ERROR";
      throw error;
    }

    // Declined / insufficient-funds resolve quickly but report failure.
    await delay(instrumentInfo.outcome === "success" ? 600 : 350);
    return simulatePaymentOutcome(instrumentInfo);
  }
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId, paymentId, signature }),
  });
  return parseJsonOrThrow(res, "Payment verification failed.");
}

/**
 * Retry policy for transient gateway failures (dropped connection / timeout).
 * Up to 3 attempts with exponential backoff (1s, 2s, 4s between attempts).
 * Business failures (declined / insufficient funds / expired card) are terminal
 * and are never retried.
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

/** True when a thrown verification error is safe to retry automatically. */
export function isTransientPaymentError(error) {
  return Boolean(error && (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT"));
}

/**
 * Verifies a payment with automatic retry + exponential backoff for transient
 * failures. Always resolves with a result object (never throws) so the UI can
 * render a receipt on eventual success or a friendly failure message:
 *   { success, reason?, enrollmentId?, attempts, attemptsUsed, retryable }
 */
export async function verifyPaymentWithRetry(
  { orderId, paymentId, signature, instrument },
  {
    maxRetries = RETRY_CONFIG.maxRetries,
    backoffMs = RETRY_CONFIG.backoffMs,
    delayFn = delay,
    verify = verifyPayment,
  } = {}
) {
  const attempts = [];
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await verify({ orderId, paymentId, signature, instrument });
      const succeeded = Boolean(result && result.success);
      attempts.push({
        attempt,
        success: succeeded,
        reason: succeeded ? null : (result && result.reason) || null,
      });

      if (succeeded) {
        return { ...result, success: true, attempts, attemptsUsed: attempt, retryable: false };
      }
      // Declined / insufficient-funds / expired-card: terminal, do not retry.
      return {
        ...result,
        success: false,
        attempts,
        attemptsUsed: attempt,
        retryable: false,
        retriesExhausted: false,
      };
    } catch (error) {
      lastError = error;
      const transient = isTransientPaymentError(error);
      attempts.push({
        attempt,
        success: false,
        reason: error.message,
        code: error.code || null,
        transient,
      });

      if (!transient) {
        return {
          success: false,
          reason: error.message,
          attempts,
          attemptsUsed: attempt,
          retryable: false,
          retriesExhausted: false,
        };
      }

      if (attempt < maxRetries) {
        await delayFn(backoffMs[attempt - 1]);
      }
    }
  }

  return {
    success: false,
    reason: lastError
      ? lastError.message
      : "Payment could not be verified after retries. Please try again.",
    attempts,
    attemptsUsed: maxRetries,
    retryable: true,
    retriesExhausted: true,
  };
}

// Keep a stable default for any code that previously hard-coded 4242.
export { FALLBACK_CARD };