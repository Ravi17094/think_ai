# Discount Code Management (Handover)

Owner: Checkout/Client Developer · Audience: whoever maintains promo codes.

## The code table

Single CSV is the source of truth: `backend/data/client-discount-codes-prod.csv`

| Column | Meaning | Notes |
| --- | --- | --- |
| `code` | Promo code shown to learners | compared case-insensitively, uppercased at display |
| `type` | `percentage` or `fixed` | CSV says `percentage`; normalized to `percent` on import |
| `value` | percentage (e.g. 15) or fixed discount (₹ e.g. 50) | fixed never exceeds the order total |
| `expiry` | `YYYY-MM-DD` | full day, compared against end-of-day UTC |
| `maxUses` | redemption cap (0 = unlimited) | usage counter in memory |
| `eligibleDepartments` | pipe-delimited list, e.g. `Engineering|Design` | empty = all departments |

### Current codes

| Code | Type | Value | Expiry | Max uses | Eligible departments |
| --- | --- | --- | --- | --- | --- |
| WELCOME25 | percent | 25 | 2027-12-31 | 500 | Engineering, Design, Marketing, Sales |
| LEARN15 | percent | 15 | 2027-06-30 | 1000 | Engineering, Design |
| COHORT50 | fixed | ₹50 | 2026-12-31 | 200 | Engineering |
| TEAM10 | percent | 10 | 2027-09-30 | 300 | Engineering, Marketing, Sales |
| GRAD20 | percent | 20 | 2026-10-31 | 750 | Career Services, Engineering, Design |

## Validation rules (order enforced)

In `backend/src/services/payments/discountService.js`; cost center format
`/^[A-Z]{2}-\d{4}$/` ("XX-0000") is **required** for discount validation.

| Status | HTTP | Message |
| --- | --- | --- |
| valid | 200 | `Discount code {code} applied` |
| invalid-format | 400 | `Format: XX-0000` |
| unknown | 404 | `Invalid discount code` |
| expired | 400 | `Discount code {code} has expired` |
| depleted | 400 | `Discount code {code} has reached its usage limit` |
| ineligible | 400 | `Discount code {code} is not eligible for your department` |

- `validateDiscount` is pure (no consumption). `applyDiscount` validates **and** consumes one
  usage — call it when an order is actually placed.
- Discount math: `percent → amount * value / 100`; `fixed → min(value, orderTotal)`.
- Endpoint: `POST /api/v1/payments/validate-discount` (frontend
  `frontend/src/api/checkoutApi.js → validateDiscount`, body `{ code, costCenter, department, amount }`).

## Frontend wiring

`frontend/src/pages/checkout/CheckoutPage.jsx`:

- **Cost center** field in the billing step (validated against the schema in
  `frontend/src/schemas/checkout.schema.js`; error shows `Format: XX-0000`).
- **Department** select drives code eligibility (defaults to `CLIENT_DEPARTMENTS[0]`).
- Applied coupon shows `₹X off` for fixed and `X% off` for percent codes.
- The order summary and the success receipt display discount, cost center and discount code;
  the receipt block also repeats the refund policy and support email.

Sha-free display strings like "e.g. THINKZ10" were replaced with a neutral "Discount code"
placeholder because that code no longer exists.

## Receipt

- Template: `backend/src/templates/email/receipt.hbs` (dependency-free renderer in
  `backend/src/services/payments/receiptService.js`, no handlebars install).
- Includes: payment id, cost center, discount code + discounted amount, enrollment id,
  currency + total paid, paid-at timestamp, refund policy, support email.

## Adding / editing a code

1. Edit `backend/data/client-discount-codes-prod.csv` (UTF-8, no header-case surprises).
2. Restart the backend — `DiscountCode` reloads the CSV at boot.
3. New codes are validated by the same pipeline; `backend/discountCheckout.test.js` covers
   valid/invalid/expired/depleted/ineligible/fixed-vs-percent and the receipt render with
   fresh codes (d2/d3/d4) so tests stay isolated.

## Costs-matrix note

The CSV is the client commission table; keep department spelling identical to the list used
in the checkout department select (`CLIENT_DEPARTMENTS` in
`frontend/src/schemas/checkout.schema.js`).