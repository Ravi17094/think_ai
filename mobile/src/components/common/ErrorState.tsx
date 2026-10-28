import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  testID?: string;
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try again',
  testID = 'error-state',
}: ErrorStateProps) {
  return (
    <View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={styles.container}
      testID={testID}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message} testID={`${testID}-message`}>
        {message}
      </Text>
      {onRetry ? (
        <Text
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retry}
          testID={`${testID}-retry`}>
          {retryLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.30)',
  },
  icon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: palette.danger,
    textAlign: 'center',
  },
  retry: {
    ...typography.label,
    color: palette.textInverse,
    backgroundColor: palette.danger,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
});

export default ErrorState;
