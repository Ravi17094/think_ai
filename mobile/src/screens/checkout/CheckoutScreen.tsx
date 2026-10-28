import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  ConfirmDialog,
  ErrorState,
  ScreenHeader,
} from '@/components/common';
import {
  CardForm,
  CheckoutSkeleton,
  CostCenterField,
  DiscountCodeInput,
  isValidCostCenter,
  OrderSummary,
  PlanCards,
  validateCard,
} from '@/components/checkout';
import { useCheckout, type CheckoutFormSnapshot } from '@/hooks/useCheckout';
import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatINR } from '@/utils/pricing';
import type { CardDetails, PaymentConfirmation } from '@/types/community';
import type { PaymentDetails } from '@/features/payments/types';
import { failureReasonFromCode } from '@/features/payments/failure';

const EMPTY_CARD: CardDetails = { number: '', expiry: '', cvv: '', name: '' };

function snapshotFromRoute(
  params: Record<string, unknown> | undefined
): CheckoutFormSnapshot {
  return (params ?? {}) as CheckoutFormSnapshot;
}

/**
 * Page 10 — Checkout (`/checkout`).
 *
 * Plan selection, custom validated card form (Luhn / expiry / CVV), discount
 * code validation, cost centre and order summary with 18% GST. Payment runs
 * intent → confirm behind a confirmation dialog; declines render the server's
 * retry attempts inline.
 */
export function CheckoutScreen({ navigation, route }: ScreenProps<'Checkout'>) {
  const initialForm = snapshotFromRoute(route.params?.formValues);
  const {
    plans,
    selectedPlan,
    selectedPlanId,
    selectPlan,
    isLoading,
    hasError,
    loadError,
    reload,
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
    paymentResult,
    paymentError,
    pay,
  } = useCheckout(route.params?.courseId, initialForm);

  const [card, setCard] = useState<CardDetails>(() => ({
    ...EMPTY_CARD,
    number: initialForm.cardNumber ?? '',
    expiry: initialForm.cardExpiry ?? '',
    name: initialForm.cardName ?? '',
  }));
  const [showCardErrors, setShowCardErrors] = useState(false);
  const [costCenterError, setCostCenterError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lastFour = card.number.replace(/\D/g, '').slice(-4);

  const requestPayment = () => {
    setShowCardErrors(true);
    if (Object.keys(validateCard(card)).length > 0) {
      setFormError('Fix the card details before paying.');
      return;
    }
    if (!isValidCostCenter(costCenter)) {
      setCostCenterError('Use the format AB-1234.');
      setFormError('Fix the cost centre before paying.');
      return;
    }
    setCostCenterError(null);
    if (!selectedPlan) {
      setFormError('Select a plan first.');
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  };

  const formSnapshot = (): CheckoutFormSnapshot => ({
    planId: selectedPlanId,
    discountCode,
    costCenter: costCenter.trim() || undefined,
    cardNumber: card.number,
    cardExpiry: card.expiry,
    cardName: card.name,
  });

  const paymentDetails = (
    result: PaymentConfirmation
  ): PaymentDetails => ({
    id: result.confirmationId ?? result.orderId,
    planName: selectedPlan?.title ?? 'Course',
    amount: totals.total,
    currency: 'INR',
    transactionId: result.confirmationId ?? result.orderId,
    paidAt: new Date().toISOString(),
    courseId: selectedPlan?.courseId ?? '',
    courseTitle: selectedPlan?.title,
  });

  const handleConfirm = async () => {
    const result = await pay(card);
    if (result === null) {
      // The request itself failed (network/5xx): keep the dialog open so the
      // learner can retry without losing anything they typed.
      return;
    }
    setConfirmOpen(false);
    const formValues = formSnapshot();
    if (result.success) {
      navigation.replace('PaymentSuccess', {
        paymentId: result.confirmationId ?? result.orderId,
        payment: paymentDetails(result),
        formValues,
      });
      return;
    }
    navigation.replace('PaymentFailed', {
      reason: failureReasonFromCode(result.failureCode),
      errorCode: result.failureCode,
      message: result.message,
      preserve: true,
      formValues,
    });
  };

  const succeeded = paymentResult !== null && paymentResult.success;
  const declined = paymentResult !== null && !paymentResult.success;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="checkout-screen">
      <ScreenHeader
        subtitle={
          selectedPlan
            ? `${selectedPlan.title} · ${formatINR(totals.total)}`
            : 'Select a plan to continue'
        }
        testID="checkout-header"
        title="Checkout"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          testID="checkout-scroll">
          {isLoading ? (
            <CheckoutSkeleton />
          ) : hasError ? (
            <ErrorState
              message={loadError ?? 'Unable to load plans.'}
              onRetry={() => void reload()}
              testID="checkout-error"
            />
          ) : succeeded ? (
            <View style={styles.successCard} testID="checkout-success">
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle} testID="checkout-success-title">
                Payment successful
              </Text>
              <Text style={styles.successMeta} testID="checkout-confirmation-id">
                Confirmation: {paymentResult.confirmationId ?? paymentResult.orderId}
              </Text>
              <Text style={styles.successMeta}>
                Attempts used: {paymentResult.attemptsUsed}
                {paymentResult.enrollmentUnlocked ? ' · Course unlocked' : ''}
              </Text>

              <View style={styles.successActions}>
                {selectedPlan ? (
                  <AppButton
                    onPress={() =>
                      navigation.navigate('CourseDetail', {
                        courseId: selectedPlan.courseId,
                      })
                    }
                    testID="checkout-view-course"
                    title="View course"
                  />
                ) : null}
                <AppButton
                  onPress={() => navigation.goBack()}
                  style={styles.flex}
                  testID="checkout-done"
                  title="Done"
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View style={styles.sections}>
              <View>
                <Text style={styles.sectionTitle} testID="checkout-plans-title">
                  1 · Choose your plan
                </Text>
                <PlanCards
                  onSelect={selectPlan}
                  plans={plans}
                  selectedId={selectedPlanId}
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>2 · Payment method</Text>
                <CardForm
                  onChange={setCard}
                  showErrors={showCardErrors}
                  testID="checkout-card"
                  value={card}
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>3 · Discount code</Text>
                <DiscountCodeInput
                  isChecking={isCheckingDiscount}
                  onChange={setDiscountCode}
                  onApply={() => void applyDiscount()}
                  onClear={clearDiscount}
                  testID="checkout-discount"
                  validation={discount}
                  value={discountCode}
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>4 · Billing details</Text>
                <CostCenterField
                  errorMessage={costCenterError}
                  onChange={setCostCenter}
                  testID="checkout-cost-center"
                  value={costCenter}
                />
              </View>

              <OrderSummary
                discount={discount}
                plan={selectedPlan}
                testID="checkout-summary"
                totals={totals}
              />

              {declined ? (
                <View style={styles.failureCard} testID="checkout-failure">
                  <Text style={styles.failureTitle} testID="checkout-payment-error">
                    {paymentError ?? 'Payment failed.'}
                  </Text>
                  {paymentResult.attempts.length > 0 ? (
                    <View testID="checkout-attempts">
                      {paymentResult.attempts.map((attempt) => (
                        <Text
                          key={attempt.attempt}
                          style={styles.attemptLine}
                          testID={`checkout-attempt-${attempt.attempt}`}>
                          Attempt {attempt.attempt}: {attempt.status}
                          {attempt.failureCode ? ` (${attempt.failureCode})` : ''}
                          {attempt.transient ? ' · retrying' : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {formError && !declined ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={styles.formError}
                  testID="checkout-form-error">
                  {formError}
                </Text>
              ) : null}

              <AppButton
                onPress={requestPayment}
                testID="checkout-pay"
                title={`Pay ${formatINR(totals.total)}`}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        confirmLabel="Pay now"
        errorMessage={paymentError}
        isBusy={isPaying}
        message={
          selectedPlan
            ? `You will be charged ${formatINR(totals.total)} for “${selectedPlan.title}”${
                lastFour ? ` using the card ending ${lastFour}` : ''
              }.`
            : undefined
        }
        onCancel={() => {
          if (!isPaying) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={() => void handleConfirm()}
        testID="checkout-confirm"
        title="Confirm payment"
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sections: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: palette.accent,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  formError: {
    ...typography.label,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: palette.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.danger,
    padding: spacing.sm,
  },
  failureCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
    borderColor: palette.danger,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  failureTitle: {
    ...typography.label,
    color: palette.danger,
  },
  attemptLine: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
    borderColor: palette.success,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  successIcon: {
    fontSize: 36,
  },
  successTitle: {
    ...typography.title,
    color: palette.success,
  },
  successMeta: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  successActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});

export default CheckoutScreen;
