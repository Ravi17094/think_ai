import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import type { ScreenProps } from '@/navigation/types';
import type { PaymentDetails } from '../types';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { failureReasonFromCode } from '../failure';
import { SuccessCheckmark } from '../components/SuccessCheckmark';
import { ConfettiBurst } from '../components/ConfettiBurst';
import { ReceiptSummary } from '../components/ReceiptSummary';
import { AccessCourseButton } from '../components/AccessCourseButton';
import { EmailConfirmationNote } from '../components/EmailConfirmationNote';

export function PaymentSuccessScreen({
  route,
  navigation,
}: ScreenProps<'PaymentSuccess'>) {
  const {
    paymentId,
    payment: initialPayment,
    formValues,
  } = route.params ?? {};
  const initial = initialPayment as PaymentDetails | undefined;
  const effectiveId = paymentId ?? initial?.id ?? null;
  const { payment, failureCode, status } = usePaymentStatus(effectiveId);

  const p: PaymentDetails | undefined = payment || initial;
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    if (status === 'timeout') {
      redirected.current = true;
      navigation.replace('PaymentFailed', {
        reason: 'network',
        preserve: true,
        formValues,
      });
      return;
    }
    if (status === 'error') {
      redirected.current = true;
      navigation.replace('PaymentFailed', {
        reason: failureReasonFromCode(failureCode ?? p?.failureReason),
        errorCode: failureCode ?? undefined,
        preserve: true,
        message: p?.failureReason,
        formValues,
      });
    }
  }, [status, p, failureCode, formValues, navigation]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="payment-success-screen">
      <SuccessCheckmark />
      <ConfettiBurst />
      <Text
        accessibilityRole="header"
        style={styles.title}
        testID="payment-success-title">
        Payment successful
      </Text>
      {p && <ReceiptSummary p={p} />}
      {p?.courseId ? (
        <AccessCourseButton
          courseId={p.courseId}
          courseTitle={p.courseTitle}
          onPress={() =>
            navigation.navigate('CourseDetail', { courseId: p.courseId })
          }
        />
      ) : null}
      {p?.receiptEmail ? <EmailConfirmationNote email={p.receiptEmail} /> : null}
      {status === 'polling' ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.polling}
          testID="payment-status-polling">
          Confirming payment...
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4caf50',
  },
  polling: {
    color: '#666',
    fontSize: 14,
  },
});
