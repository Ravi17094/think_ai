import { useCallback, useEffect, useMemo, useState } from 'react';

import { createOrderId } from '@/api/communityClient';
import { toErrorMessage } from './useAsyncResource';
import { useApiClient } from './useApiClient';
import { useSession } from './useSession';
import { computeTotals, defaultPlanId } from '@/utils/pricing';
import type {
  CardDetails,
  CheckoutPlan,
  DiscountValidation,
  PaymentConfirmation,
  PaymentIntent,
} from '@/types/community';

/** Non-sensitive checkout fields restored after a declined payment. */
export interface CheckoutFormSnapshot {
  [key: string]: unknown;
  planId?: string;
  discountCode?: string;
  costCenter?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardName?: string;
}

/**
 * Page 10 - Checkout data source.
 *
 * Plans come from `GET /api/courses`, discount validation from
 * `POST /api/v1/payments/validate-discount`, and payment runs through
 * `createPaymentIntent` (cross-team endpoint, degrades to a deferred intent)
 * followed by the supported `POST /api/v1/payments/confirm`.
 */
export function useCheckout(
  initialCourseId?: string,
  initialForm?: CheckoutFormSnapshot
) {
  const client = useApiClient();
  const session = useSession();

  const [plans, setPlans] = useState<CheckoutPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(
    initialForm?.planId ?? ''
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [discountCode, setDiscountCode] = useState(
    initialForm?.discountCode ?? ''
  );
  const [discount, setDiscount] = useState<DiscountValidation | null>(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  const [costCenter, setCostCenter] = useState(initialForm?.costCenter ?? '');
  const [isPaying, setIsPaying] = useState(false);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentConfirmation | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const nextPlans = await client.fetchPlans();
      setPlans(nextPlans);
      setSelectedPlanId((current) => {
        if (current !== '' && nextPlans.some((plan) => plan.id === current)) {
          return current;
        }
        const byCourse = initialCourseId
          ? nextPlans.find((plan) => plan.courseId === initialCourseId)
          : undefined;
        return (byCourse ?? { id: defaultPlanId(nextPlans) }).id;
      });
    } catch (cause) {
      setLoadError(toErrorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [client, initialCourseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? null;

  const totals = useMemo(
    () => computeTotals(selectedPlan?.price ?? 0, discount),
    [selectedPlan, discount]
  );

  const applyDiscount = useCallback(async () => {
    const code = discountCode.trim();
    if (code === '' || !selectedPlan) {
      return;
    }
    setIsCheckingDiscount(true);
    try {
      const result = await client.validateDiscountCode({
        code,
        costCenter: costCenter.trim() || undefined,
        amount: selectedPlan.price,
      });
      setDiscount(result);
    } catch (cause) {
      setDiscount({
        valid: false,
        status: 'unknown',
        message: toErrorMessage(cause),
        discount: null,
        discountAmount: 0,
      });
    } finally {
      setIsCheckingDiscount(false);
    }
  }, [client, costCenter, discountCode, selectedPlan]);

  const clearDiscount = useCallback(() => {
    setDiscount(null);
    setDiscountCode('');
  }, []);

  /**
   * Full payment run: intent → confirm. Returns the confirmation (success or
   * decline) or `null` when a request failed outright (see `paymentError`).
   */
  const pay = useCallback(
    async (
      card: CardDetails,
      email?: string
    ): Promise<PaymentConfirmation | null> => {
      if (!selectedPlan) {
        return null;
      }
      setIsPaying(true);
      setPaymentError(null);
      setPaymentResult(null);
      setIntent(null);
      try {
        const totalsNow = computeTotals(selectedPlan.price, discount);
        const costCenterValue = costCenter.trim() || undefined;
        const appliedCode =
          discount?.valid && discountCode.trim() !== ''
            ? discountCode.trim()
            : undefined;

        const paymentIntent = await client.createPaymentIntent({
          amount: totalsNow.total,
          currency: 'INR',
          courseId: selectedPlan.courseId,
          costCenter: costCenterValue,
          discountCode: appliedCode,
        });
        setIntent(paymentIntent);

        const result = await client.confirmPayment({
          intent: paymentIntent,
          orderId: createOrderId('ord'),
          userId: session.userId,
          courseId: selectedPlan.courseId,
          amount: totalsNow.total,
          currency: 'INR',
          email,
          costCenter: costCenterValue,
          discountCode: appliedCode,
          discountValue: appliedCode ? totalsNow.discountAmount : undefined,
          card,
        });
        setPaymentResult(result);
        if (!result.success) {
          setPaymentError(result.message ?? 'Payment was declined.');
        }
        return result;
      } catch (cause) {
        setPaymentError(toErrorMessage(cause));
        return null;
      } finally {
        setIsPaying(false);
      }
    },
    [client, costCenter, discount, discountCode, selectedPlan, session.userId]
  );

  const resetPayment = useCallback(() => {
    setPaymentResult(null);
    setPaymentError(null);
    setIntent(null);
  }, []);

  return {
    plans,
    selectedPlan,
    selectedPlanId,
    selectPlan: setSelectedPlanId,
    isLoading,
    hasError: loadError !== null,
    loadError,
    reload: load,
    discountCode,
    setDiscountCode,
    discount,
    isCheckingDiscount,
    applyDiscount,
    clearDiscount,
    costCenter,
    setCostCenter,
    totals,
    isPaying,
    intent,
    paymentResult,
    paymentError,
    pay,
    resetPayment,
  };
}

export default useCheckout;
