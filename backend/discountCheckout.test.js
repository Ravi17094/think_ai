const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const discountService = require("./src/services/payments/discountService");
const discountModel = require("./src/models/DiscountCode");
const receiptService = require("./src/services/payments/receiptService");
const paymentRoutes = require("./src/routes/paymentRoutes");

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

test("cost center must match the client format XX-0000", () => {
  assert.ok(discountService.isValidCostCenter("HR-2501"));
  assert.ok(discountService.isValidCostCenter("QA-0000"));
  assert.equal(discountService.isValidCostCenter("hh-25"), false);
  assert.equal(discountService.isValidCostCenter("HR25"), false);
  assert.equal(discountService.isValidCostCenter("HR-25010"), false);
  assert.equal(discountService.isValidCostCenter(""), false);
});

test("validateDiscount rejects a malformed cost center with Format: XX-0000", () => {
  const result = discountService.validateDiscount({
    code: "WELCOME25",
    costCenter: "hr-25",
    department: "engineering",
    amount: 1000,
  });
  assert.equal(result.valid, false);
  assert.equal(result.message, "Format: XX-0000");
});

test("validateDiscount rejects an unknown code", () => {
  const result = discountService.validateDiscount({ code: "NOTREAL", costCenter: "HR-2501" });
  assert.equal(result.valid, false);
  assert.equal(result.status, "unknown");
});

test("validateDiscount enforces department eligibility", () => {
  const eligible = discountService.validateDiscount({
    code: "COHORT50",
    costCenter: "QA-0001",
    department: "engineering",
    amount: 5000,
  });
  assert.equal(eligible.valid, true);
  const restricted = discountService.validateDiscount({
    code: "COHORT50",
    costCenter: "QA-0001",
    department: "finance",
    amount: 5000,
  });
  assert.equal(restricted.valid, false);
  assert.equal(restricted.status, "ineligible");
});

test("percent codes apply a percentage discount", () => {
  const result = discountService.validateDiscount({
    code: "WELCOME25",
    costCenter: "HR-2501",
    department: "marketing",
    amount: 2000,
  });
  assert.equal(result.valid, true);
  assert.equal(result.discount.type, "percent");
  assert.equal(result.discountAmount, 500);
});

test("fixed codes apply a flat amount capped at the order total", () => {
  const result = discountService.validateDiscount({
    code: "COHORT50",
    costCenter: "QA-0001",
    department: "engineering",
    amount: 30,
  });
  assert.equal(result.discount.type, "fixed");
  assert.equal(result.discountAmount, 30);
});

test("applyDiscount consumes one usage but validateDiscount does not", () => {
  discountModel.resetForTests();
  discountService.validateDiscount({ code: "TEAM10", costCenter: "HR-2501", department: "sales", amount: 100 });
  assert.equal(discountModel.findByCode("TEAM10").usage, 0);

  const applied = discountService.applyDiscount({ code: "TEAM10", costCenter: "HR-2501", department: "sales", amount: 100 });
  assert.equal(applied.applied, true);
  assert.equal(discountModel.findByCode("TEAM10").usage, 1);
});

test("POST /api/v1/payments/validate-discount returns the discount payload", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/payments/validate-discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "WELCOME25", costCenter: "HR-2501", department: "design", amount: 1000 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.valid, true);
    assert.equal(body.data.discount.code, "WELCOME25");
    assert.equal(body.data.discountAmount, 250);
  });
});

test("POST /api/v1/payments/validate-discount returns 400 for a bad cost center", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/payments/validate-discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "WELCOME25", costCenter: "bad", amount: 1000 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, "Format: XX-0000");
  });
});

test("POST /api/v1/payments/validate-discount returns 404 for an unknown code", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/payments/validate-discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "NOPE", costCenter: "HR-2501" }),
    });
    assert.equal(res.status, 404);
  });
});

test("receipt template renders the cost center, discount code and refund policy", () => {
  const rendered = receiptService.renderReceipt({
    orderId: "order_123",
    enrollmentId: "enr_9",
    courseTitle: "React Fundamentals",
    costCenter: "HR-2501",
    discountCode: "WELCOME25",
    discountValue: 250,
    amount: 750,
    currency: "₹",
    paidAt: new Date("2026-09-21T10:00:00Z"),
  });
  assert.ok(rendered.html.includes("HR-2501"), "receipt must show the cost center");
  assert.ok(rendered.html.includes("WELCOME25"), "receipt must show the discount code");
  assert.ok(rendered.html.includes("Refund policy"), "receipt must include the refund policy");
  assert.ok(
    rendered.html.includes("learning-support@clientdomain.com"),
    "receipt must show the client support email"
  );
  assert.ok(rendered.html.includes("₹750.00"), "receipt must show the paid amount");
  assert.ok(rendered.html.includes("-₹250.00"), "receipt must show the discount applied");
});

test("POST /api/v1/payments/receipt returns rendered HTML from the template", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/payments/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "order_1",
        courseTitle: "Design 101",
        costCenter: "DS-1000",
        discountCode: "LEARN15",
        discountValue: 150,
        amount: 850,
        currency: "₹",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.receiptHtml.includes("DS-1000"));
    assert.ok(body.data.receiptHtml.includes("LEARN15"));
    assert.ok(body.data.supportEmail.includes("learning-support@clientdomain.com"));
  });
});