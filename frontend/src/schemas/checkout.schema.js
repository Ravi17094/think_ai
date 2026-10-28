/**
 * Client checkout validation schema (Checkout Client Customization).
 *
 * The client mandates a cost-center field on every order, validated with the
 * format "XX-0000". This module is the single source of truth for the pattern,
 * the user-facing error text, the client refund policy and support contact used
 * on the receipt.
 */

export const COST_CENTER_PATTERN = /^[A-Z]{2}-\d{4}$/;
export const COST_CENTER_FORMAT_MESSAGE = "Format: XX-0000";

/** Client community/support contact shown on receipts and refund notices. */
export const CLIENT_SUPPORT_EMAIL = "learning-support@clientdomain.com";

/** Client refund policy paragraph rendered on the receipt. */
export const CLIENT_REFUND_POLICY =
  "All course purchases are eligible for a full refund within 14 days of purchase if the course has not been completed. Refund requests are processed back to the original payment method within 5–7 business days. Completed courses and requests made after 14 days are not eligible for a refund.";

/** Departments the client discount codes can be restricted to. */
export const CLIENT_DEPARTMENTS = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Career Services",
];

/**
 * Validates a cost center value.
 * @returns {true} when valid, otherwise the user-facing format message.
 */
export function validateCostCenter(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return COST_CENTER_PATTERN.test(normalized) ? true : COST_CENTER_FORMAT_MESSAGE;
}