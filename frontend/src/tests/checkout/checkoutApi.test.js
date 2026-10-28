import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_CARD,
  PAYMENT_TEST_INSTRUMENTS,
  RETRY_CONFIG,
  isTransientPaymentError,
  resolvePaymentInstrument,
  simulatePaymentOutcome,
  verifyPayment,
  verifyPaymentWithRetry,
  createOrder,
  validateDiscount,
} from "../../api/checkoutApi";
import { validateCostCenter } from "../../schemas/checkout.schema";

const CARD_SUCCESS = "4242 4242 4242 4242";
const CARD_DECLINED = "4000 0000 0000 0002";
const CARD_INSUFFICIENT = "4000 0000 0000 9995";
const CARD_EXPIRED = "4000 0000 0000 0069";
const CARD_NETWORK = "4000 0000 0000 0009";
const CARD_TIMEOUT = "4000 0000 0000 0029";

describe("checkoutApi scenario matrix", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the full Day 13 test-instrument matrix", () => {
    expect(PAYMENT_TEST_INSTRUMENTS).toHaveLength(6);
    expect(PAYMENT_TEST_INSTRUMENTS.map((i) => i.outcome)).toEqual([
      "success",
      "declined",
      "insufficient-funds",
      "expired-card",
      "network-error",
      "timeout",
    ]);
    expect(FALLBACK_CARD).toBe(CARD_SUCCESS);
  });

  it("resolves each Stripe test card to its simulated scenario", () => {
    expect(resolvePaymentInstrument({ cardNumber: CARD_SUCCESS }).outcome).toBe("success");
    expect(resolvePaymentInstrument({ cardNumber: CARD_DECLINED }).outcome).toBe("declined");
    expect(resolvePaymentInstrument({ cardNumber: CARD_INSUFFICIENT }).outcome).toBe("insufficient-funds");
    expect(resolvePaymentInstrument({ cardNumber: CARD_EXPIRED }).outcome).toBe("expired-card");
    expect(resolvePaymentInstrument({ cardNumber: CARD_NETWORK }).outcome).toBe("network-error");
    expect(resolvePaymentInstrument({ cardNumber: CARD_TIMEOUT }).outcome).toBe("timeout");
  });

  it("matches UPI ids and tolerates formatting noise", () => {
    expect(resolvePaymentInstrument({ method: "card", cardNumber: " 4242  4242-4242-4242 " }).outcome).toBe(
      "success"
    );
    expect(resolvePaymentInstrument({ method: "upi", upiId: "someone@okbank 4000000000000002" }).outcome).toBe(
      "declined"
    );
  });

  it("returns null for unknown instruments", () => {
    expect(resolvePaymentInstrument({ cardNumber: "4111 1111 1111 1111" })).toBeNull();
  });

  it("succeeds a payment and returns an enrollment id", async () => {
    const result = await verifyPayment({
      orderId: "o1",
      paymentId: "p1",
      instrument: { outcome: "success" },
    });
    expect(result.success).toBe(true);
    expect(result.enrollmentId).toMatch(/^enr_mock_/);
  });

  it("declines the card with a friendly reason", async () => {
    const result = await verifyPayment({
      orderId: "o1",
      paymentId: "p1",
      instrument: { outcome: "declined" },
    });
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/declined/i);
  });

  it("reports insufficient funds", async () => {
    const result = await verifyPayment({
      orderId: "o1",
      paymentId: "p1",
      instrument: { outcome: "insufficient-funds" },
    });
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/insufficient funds/i);
  });

  it("reports an expired card with a specific message", async () => {
    const result = await verifyPayment({
      orderId: "o1",
      paymentId: "p1",
      instrument: { outcome: "expired-card" },
    });
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });

  it("throws a network error mid-verification", async () => {
    await expect(
      verifyPayment({ orderId: "o1", paymentId: "p1", instrument: { outcome: "network-error" } })
    ).rejects.toThrow(/network error/i);
  });

  it("throws after the timeout window when the gateway never answers", async () => {
    vi.useFakeTimers();
    let capturedError = null;
    verifyPayment({ orderId: "o1", paymentId: "p1", instrument: { outcome: "timeout" } }).then(
      () => {},
      (err) => {
        capturedError = err;
      }
    );
    await vi.advanceTimersByTimeAsync(8500);
    await vi.waitFor(() => expect(capturedError).toBeTruthy());
    expect(capturedError.message).toMatch(/timed out/i);
    vi.useRealTimers();
  });

  it("drives the declined/success outcomes through simulatePaymentOutcome", () => {
    expect(simulatePaymentOutcome({ outcome: "declined" }).success).toBe(false);
    expect(simulatePaymentOutcome({ outcome: "success" }).success).toBe(true);
    expect(() => simulatePaymentOutcome({ outcome: "network-error" })).toThrowError(/network error/i);
    expect(() => simulatePaymentOutcome({ outcome: "timeout" })).toThrowError(/timed out/i);
  });

  it("creates a mock order with the course and amount echoed back", async () => {
    const order = await createOrder({ courseId: "c1", amount: 499, currency: "INR" });
    expect(order.orderId).toMatch(/^order_mock_/);
    expect(order.courseId).toBe("c1");
    expect(order.amount).toBe(499);
    expect(order.currency).toBe("INR");
  });
});

describe("checkoutApi retry with exponential backoff", () => {
  it("retries transient failures then succeeds and reports attempts", async () => {
    const delays = [];
    const verify = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("Network error"), { code: "NETWORK_ERROR" }))
      .mockRejectedValueOnce(Object.assign(new Error("timed out"), { code: "TIMEOUT" }))
      .mockResolvedValueOnce({ success: true, enrollmentId: "enr_mock_1" });

    const result = await verifyPaymentWithRetry(
      { orderId: "o1", paymentId: "p1", instrument: { outcome: "success" } },
      { verify, delayFn: async (ms) => delays.push(ms) }
    );

    expect(result.success).toBe(true);
    expect(result.attemptsUsed).toBe(3);
    expect(result.enrollmentId).toBe("enr_mock_1");
    expect(delays).toEqual([1000, 2000]);
    expect(verify).toHaveBeenCalledTimes(3);
  });

  it("stops immediately on a declined card (no retries)", async () => {
    const delays = [];
    const verify = vi.fn().mockResolvedValue({ success: false, reason: "Your card was declined." });
    const result = await verifyPaymentWithRetry({}, { verify, delayFn: async (ms) => delays.push(ms) });
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/declined/i);
    expect(result.attemptsUsed).toBe(1);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  it("does not retry an expired card", async () => {
    const verify = vi.fn().mockResolvedValue({ success: false, reason: "Your card has expired." });
    const result = await verifyPaymentWithRetry({}, { verify, delayFn: async () => {} });
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it("gives up after the max 3 attempts and reports exhaustion", async () => {
    const delays = [];
    const verify = vi.fn().mockRejectedValue(Object.assign(new Error("Network error"), { code: "NETWORK_ERROR" }));
    const result = await verifyPaymentWithRetry({}, { verify, delayFn: async (ms) => delays.push(ms) });
    expect(result.success).toBe(false);
    expect(result.retriesExhausted).toBe(true);
    expect(result.retryable).toBe(true);
    expect(result.attemptsUsed).toBe(3);
    expect(result.attempts).toHaveLength(3);
    expect(delays).toEqual([1000, 2000]);
    expect(verify).toHaveBeenCalledTimes(3);
  });

  it("uses the documented retry policy and classifies transient errors", () => {
    expect(RETRY_CONFIG).toEqual({ maxRetries: 3, backoffMs: [1000, 2000, 4000] });
    expect(isTransientPaymentError({ code: "NETWORK_ERROR" })).toBe(true);
    expect(isTransientPaymentError({ code: "TIMEOUT" })).toBe(true);
    expect(isTransientPaymentError(new Error("declined"))).toBe(false);
  });
});

describe("checkout cost center schema", () => {
  it("accepts the client format XX-0000", () => {
    expect(validateCostCenter("HR-2501")).toBe(true);
    expect(validateCostCenter("qa-0008")).toBe(true);
  });

  it("rejects anything that is not two letters, a dash and four digits", () => {
    expect(validateCostCenter("HR25")).toMatch(/XX-0000/);
    expect(validateCostCenter("HR-25010")).toMatch(/XX-0000/);
    expect(validateCostCenter("")).toMatch(/XX-0000/);
    expect(validateCostCenter("12-3456")).toMatch(/XX-0000/);
  });
});

describe("checkoutApi discount validation (client customization)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    try {
      localStorage.clear();
    } catch {
      /* storage unavailable */
    }
  });

  const VALID_PAYLOAD = {
    success: true,
    data: {
      valid: true,
      status: "valid",
      message: "Discount code WELCOME25 applied",
      discount: {
        code: "WELCOME25",
        type: "percent",
        value: 25,
        eligibleDepartments: ["engineering"],
        usage: 0,
        maxUses: 500,
      },
      discountAmount: 250,
      currencyApplied: true,
    },
  };

  it("validates a discount code against /api/v1/payments/validate-discount", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => VALID_PAYLOAD,
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = await validateDiscount({
      code: "WELCOME25",
      costCenter: "HR-2501",
      department: "engineering",
      amount: 1000,
    });

    expect(payload.data.discountAmount).toBe(250);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/payments/validate-discount");
    expect(JSON.parse(init.body)).toMatchObject({
      code: "WELCOME25",
      costCenter: "HR-2501",
      department: "engineering",
      amount: 1000,
    });
  });

  it("throws the server message for a malformed cost center", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ success: false, status: "invalid-format", message: "Format: XX-0000" }),
      })
    );
    await expect(validateDiscount({ code: "WELCOME25", costCenter: "bad" })).rejects.toMatchObject({
      message: "Format: XX-0000",
      status: 400,
    });
  });

  it("throws a friendly error for an unknown discount code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, status: "unknown", message: "Invalid discount code" }),
      })
    );
    await expect(validateDiscount({ code: "NOPE", costCenter: "HR-2501" })).rejects.toMatchObject({
      message: "Invalid discount code",
      status: 404,
    });
  });

  it("rejects when the backend is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(validateDiscount({ code: "WELCOME25", costCenter: "HR-2501" })).rejects.toThrow(
      /discount validation is unavailable/i
    );
  });

  it("surfaces a useful error when the server replies with non-JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError("not json");
        },
      })
    );
    await expect(validateDiscount({ code: "WELCOME25", costCenter: "HR-2501" })).rejects.toMatchObject({
      message: "Discount validation failed.",
      status: 500,
    });
  });
});