import type { CheckoutPlan, DiscountValidation } from '@/types/community';

/** GST applied to every checkout total (18%, per the pricing spec). */
export const GST_RATE = 0.18;

export interface CheckoutTotals {
  /** Plan list price. */
  subtotal: number;
  /** Validated discount deduction (clamped to the subtotal). */
  discountAmount: number;
  /** 18% GST charged on the discounted amount. */
  gst: number;
  /** subtotal − discount + gst. */
  total: number;
}

/** Pure price maths — unit tested without rendering anything. */
export function computeTotals(
  subtotal: number,
  discount: DiscountValidation | null
): CheckoutTotals {
  const discountAmount =
    discount && discount.valid
      ? Math.min(Math.max(discount.discountAmount, 0), subtotal)
      : 0;
  const taxable = subtotal - discountAmount;
  const gst = Math.round(taxable * GST_RATE * 100) / 100;
  return {
    subtotal,
    discountAmount,
    gst,
    total: Math.round((taxable + gst) * 100) / 100,
  };
}

/** `₹1,234` — Indian grouping via `toLocaleString('en-IN')`. */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

/** The recommended (cheapest) plan, falling back to the first plan. */
export function defaultPlanId(plans: CheckoutPlan[]): string {
  const recommended = plans.find((plan) => plan.recommended);
  return (recommended ?? plans[0])?.id ?? '';
}
