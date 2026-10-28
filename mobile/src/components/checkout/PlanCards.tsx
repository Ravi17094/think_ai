import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatINR } from '@/utils/pricing';
import type { CheckoutPlan } from '@/types/community';

export interface PlanCardsProps {
  plans: CheckoutPlan[];
  selectedId: string;
  onSelect: (planId: string) => void;
  testID?: string;
}

/** Selectable plan cards (cheapest plan is pre-marked as recommended). */
export function PlanCards({
  plans,
  selectedId,
  onSelect,
  testID = 'plan-cards',
}: PlanCardsProps) {
  return (
    <View style={styles.list} testID={testID}>
      {plans.map((plan, index) => {
        const isSelected = plan.id === selectedId;
        return (
          <Pressable
            accessibilityLabel={`${plan.title}, ${formatINR(plan.price)}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            key={plan.id}
            onPress={() => onSelect(plan.id)}
            style={[styles.card, isSelected && styles.cardSelected]}
            testID={`${testID}-plan-${index}`}>
            <View style={styles.cardHeader}>
              <View
                style={[styles.radio, isSelected && styles.radioSelected]}
                testID={`${testID}-plan-${index}-radio`}
              />
              <Text style={styles.title} numberOfLines={2}>
                {plan.title}
              </Text>
              <Text style={styles.price} testID={`${testID}-plan-${index}-price`}>
                {formatINR(plan.price)}
              </Text>
            </View>

            {plan.recommended ? (
              <Text style={styles.recommended} testID={`${testID}-plan-${index}-recommended`}>
                Recommended — lowest price
              </Text>
            ) : null}

            {plan.description ? (
              <Text numberOfLines={2} style={styles.description}>
                {plan.description}
              </Text>
            ) : null}

            {plan.features.length > 0 ? (
              <View style={styles.features}>
                {plan.features.map((feature) => (
                  <Text key={feature} style={styles.feature}>
                    ✓ {feature}
                  </Text>
                ))}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardSelected: {
    borderColor: palette.brand,
    borderWidth: 2,
    padding: spacing.md - 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radio: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: palette.borderStrong,
  },
  radioSelected: {
    borderColor: palette.brand,
    backgroundColor: palette.brand,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
    flex: 1,
  },
  price: {
    ...typography.subtitle,
    color: palette.accent,
    fontWeight: '700',
  },
  recommended: {
    ...typography.caption,
    color: palette.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: spacing.lg,
  },
  description: {
    ...typography.caption,
    color: palette.textSecondary,
    marginLeft: spacing.lg,
  },
  features: {
    gap: spacing.xxs,
    marginLeft: spacing.lg,
  },
  feature: {
    ...typography.caption,
    color: palette.textSecondary,
  },
});

export default PlanCards;
