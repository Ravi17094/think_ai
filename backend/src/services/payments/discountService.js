/**
 * Client checkout discount service (deliverable #2 areas).
 *
 * Validates discount codes against the client commission table and enforces
 * the client-mandated cost-center format:  /^[A-Z]{2}-\d{4}$/   ("XX-0000").
 *
 * Rules enforced (in order):
 *   1. Cost center MUST match "XX-0000" when present.
 *   2. Code must exist in the commission table.
 *   3. Code must not have expired (expiry is a date in YYYY-MM-DD format).
 *   4. Code must not exceed maxUses.
 *   5. If eligibleDepartments is non-empty, the checkout department must match.
 */

const DiscountCode = require("../../models/DiscountCode");

const COST_CENTER_PATTERN = /^[A-Z]{2}-\d{4}$/;
const COST_CENTER_FORMAT_MESSAGE = "Format: XX-0000";

function isValidCostCenter(costCenter) {
    return COST_CENTER_PATTERN.test(String(costCenter || "").trim());
}

function isExpired(discount, now) {
    if (!discount.expiry) return false;
    const expiryTime = new Date(`${discount.expiry}T23:59:59.999Z`).getTime();
    if (Number.isNaN(expiryTime)) return false;
    return (now || Date.now()) > expiryTime;
}

function isEligible(discount, department) {
    if (!discount.eligibleDepartments || discount.eligibleDepartments.length === 0) return true;
    const dept = String(department || "").trim().toLowerCase();
    return discount.eligibleDepartments.includes(dept);
}

/**
 * Computes the discounted amount for an order total.
 *   percent -> amount * value / 100
 *   fixed   -> min(value, amount)   (never discounts more than the order)
 */
function computeDiscountAmount(discount, amount) {
    const total = Math.max(Number(amount) || 0, 0);
    if (discount.type === "fixed") {
        return Math.min(discount.value, total);
    }
    return (total * discount.value) / 100;
}

/**
 * Validates a discount code at checkout. Pure — does NOT consume usage.
 * Returns { valid, status, discount?, discountAmount?, message } where status
 * is one of: "valid" | "invalid-format" | "unknown" | "expired" | "depleted" | "ineligible".
 */
function validateDiscount({ code, costCenter, department, amount }) {
    if (costCenter !== undefined && costCenter !== null && !isValidCostCenter(costCenter)) {
        return {
            valid: false,
            status: "invalid-format",
            message: COST_CENTER_FORMAT_MESSAGE
        };
    }

    const discount = DiscountCode.findByCode(code);
    if (!discount) {
        return { valid: false, status: "unknown", message: "Invalid discount code" };
    }

    if (isExpired(discount)) {
        return { valid: false, status: "expired", message: `Discount code ${discount.code} has expired` };
    }

    if (discount.maxUses > 0 && discount.usage >= discount.maxUses) {
        return { valid: false, status: "depleted", message: `Discount code ${discount.code} has reached its usage limit` };
    }

    if (!isEligible(discount, department)) {
        return {
            valid: false,
            status: "ineligible",
            message: `Discount code ${discount.code} is not eligible for your department`
        };
    }

    const discountAmount = computeDiscountAmount(discount, amount);

    return {
        valid: true,
        status: "valid",
        message: `Discount code ${discount.code} applied`,
        discount: {
            code: discount.code,
            type: discount.type,
            value: discount.value,
            eligibleDepartments: [...discount.eligibleDepartments],
            usage: discount.usage,
            maxUses: discount.maxUses
        },
        discountAmount,
        currencyApplied: discountAmount > 0
    };
}

/**
 * Validates AND consumes one usage of a code. Called when an order is actually
 * placed. Returns the same shape as validateDiscount plus `applied: true`.
 */
function applyDiscount({ code, costCenter, department, amount }) {
    const result = validateDiscount({ code, costCenter, department, amount });
    if (!result.valid) return result;
    DiscountCode.incrementUsage(code);
    return { ...result, applied: true };
}

const discountService = {
    COST_CENTER_PATTERN,
    COST_CENTER_FORMAT_MESSAGE,
    isValidCostCenter,
    validateDiscount,
    applyDiscount,
    computeDiscountAmount
};

module.exports = discountService;