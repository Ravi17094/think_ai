import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/common';
import { palette, radii, spacing } from '@/theme/tokens';

/**
 * Checkout skeleton — mirrors the plan cards, payment form and order summary
 * so the page has no empty flash while plans load.
 */
export function CheckoutSkeleton({
  testID = 'checkout-skeleton',
}: {
  testID?: string;
}) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.card}>
        <Skeleton height={16} width="55%" testID={`${testID}-plan-title`} />
        <Skeleton height={12} width="80%" />
        <Skeleton height={12} width="64%" />
      </View>
      <View style={styles.card}>
        <Skeleton height={16} width="45%" />
        <Skeleton height={12} width="72%" />
        <Skeleton height={12} width="58%" />
      </View>

      <View style={styles.card}>
        <Skeleton height={12} width="32%" testID={`${testID}-card-label`} />
        <Skeleton height={44} width="100%" radius={12} testID={`${testID}-card-number`} />
        <View style={styles.row}>
          <Skeleton height={44} width="48%" radius={12} />
          <Skeleton height={44} width="48%" radius={12} />
        </View>
        <Skeleton height={44} width="100%" radius={12} />
      </View>

      <View style={styles.card}>
        <Skeleton height={14} width="50%" />
        <Skeleton height={14} width="70%" />
        <Skeleton height={18} width="44%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default CheckoutSkeleton;
