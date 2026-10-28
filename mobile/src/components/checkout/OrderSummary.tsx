import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatINR, type CheckoutTotals } from '@/utils/pricing';
import type { CheckoutPlan, DiscountValidation } from '@/types/community';

export interface OrderSummaryProps {
  plan: CheckoutPlan | null;
  totals: CheckoutTotals;
  discount: DiscountValidation | null;
  testID?: string;
}

/** Price breakdown: plan, discount, 18% GST and the payable total. */
export function OrderSummary({
  plan,
  totals,
  discount,
  testID = 'order-summary',
}: OrderSummaryProps) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.heading}>Order summary</Text>

      <Row
        label={plan ? plan.title : 'Plan'}
        testID={`${testID}-plan`}
        value={formatINR(totals.subtotal)}
      />

      {totals.discountAmount > 0 && discount ? (
        <Row
          label={`Discount (${discount.discount?.code ?? discount.status})`}
          testID={`${testID}-discount`}
          tone="discount"
          value={`− ${formatINR(totals.discountAmount)}`}
        />
      ) : null}

      <Row label="GST (18%)" testID={`${testID}-gst`} value={formatINR(totals.gst)} />

      <View style={styles.divider} />

      <Row
        bold
        label="Total payable"
        testID={`${testID}-total`}
        value={formatINR(totals.total)}
      />
    </View>
  );
}

function Row({
  label,
  value,
  bold = false,
  tone,
  testID,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: 'discount';
  testID: string;
}) {
  return (
    <View style={styles.row}>
      <Text
        style={[styles.label, bold && styles.bold]}
        numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          bold && styles.bold,
          tone === 'discount' && styles.discountValue,
        ]}
        testID={testID}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  heading: {
    ...typography.label,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    color: palette.textSecondary,
    flexShrink: 1,
  },
  value: {
    ...typography.body,
    color: palette.textPrimary,
  },
  discountValue: {
    color: palette.success,
    fontWeight: '700',
  },
  bold: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    borderTopColor: palette.borderStrong,
    borderTopWidth: 1,
    marginVertical: spacing.xs,
  },
});

export default OrderSummary;
