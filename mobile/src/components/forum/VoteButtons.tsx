import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, hitSlop, spacing, typography } from '@/theme/tokens';
import type { VoteDirection } from '@/types/community';

export interface VoteButtonsProps {
  score: number;
  userVote: VoteDirection;
  onVote: (direction: VoteDirection) => void;
  disabled?: boolean;
  orientation?: 'vertical' | 'horizontal';
  testID?: string;
}

/**
 * Thread vote control backed by `POST /api/discussions/:id/vote`.
 * Pressing the active arrow again clears the vote (`none`).
 */
export function VoteButtons({
  score,
  userVote,
  onVote,
  disabled = false,
  orientation = 'vertical',
  testID = 'vote-buttons',
}: VoteButtonsProps) {
  const press = (direction: VoteDirection) => () => {
    if (!disabled) {
      onVote(direction);
    }
  };

  const upSelected = userVote === 'up';
  const downSelected = userVote === 'down';

  return (
    <View
      accessibilityRole="summary"
      style={[styles.row, orientation === 'vertical' && styles.column]}
      testID={testID}>
      <Pressable
        accessibilityLabel={upSelected ? 'Remove upvote' : 'Upvote'}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: upSelected }}
        hitSlop={hitSlop}
        onPress={press('up')}
        style={styles.button}
        testID={`${testID}-up`}>
        <Text style={[styles.arrow, upSelected && styles.upSelected]}>▲</Text>
      </Pressable>

      <Text
        accessibilityLabel={`Score ${score}`}
        style={[styles.score, upSelected && styles.upSelected, downSelected && styles.downSelected]}
        testID={`${testID}-score`}>
        {score}
      </Text>

      <Pressable
        accessibilityLabel={downSelected ? 'Remove downvote' : 'Downvote'}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: downSelected }}
        hitSlop={hitSlop}
        onPress={press('down')}
        style={styles.button}
        testID={`${testID}-down`}>
        <Text style={[styles.arrow, downSelected && styles.downSelected]}>▼</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    gap: spacing.xxs,
  },
  column: {
    flexDirection: 'column',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 32,
  },
  arrow: {
    ...typography.label,
    color: palette.textSecondary,
    fontSize: 14,
  },
  score: {
    ...typography.label,
    color: palette.textPrimary,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  upSelected: {
    color: palette.success,
  },
  downSelected: {
    color: palette.danger,
  },
});

export default VoteButtons;
