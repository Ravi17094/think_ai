import { ScrollView, StyleSheet, Text } from 'react-native';

import type { ScreenProps } from '@/navigation/types';
import { ErrorIcon } from '../components/ErrorIcon';
import { FailureReason } from '../components/FailureReason';
import { RetryButton } from '../components/RetryButton';
import { SupportContactLink } from '../components/SupportContactLink';
import { usePaymentFailure } from '../hooks/usePaymentFailure';

export function PaymentFailedScreen({
  route,
  navigation,
}: ScreenProps<'PaymentFailed'>) {
  const { reason, errorCode, message, preserve, formValues } = usePaymentFailure(
    route.params
  );
  const onRetry = () => {
    if (preserve) {
      navigation.navigate('Checkout', { formValues });
    } else {
      navigation.navigate('Checkout');
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.container} testID="payment-failed-screen">
      <ErrorIcon type={reason} />
      <FailureReason type={reason} />
      {message ? (
        <Text style={styles.message} testID="failure-message">
          {message}
        </Text>
      ) : null}
      {errorCode ? (
        <Text style={styles.errorCode} testID="failure-code">
          Error code: {errorCode}
        </Text>
      ) : null}
      <RetryButton onPress={onRetry} />
      <SupportContactLink />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  message: {
    color: '#444',
    textAlign: 'center',
    maxWidth: 400,
  },
  errorCode: {
    color: '#888',
    fontSize: 12,
  },
});
