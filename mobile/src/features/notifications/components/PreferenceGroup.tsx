import { StyleSheet, Text, View } from 'react-native';

import { EventGroup, GroupPrefs, Channel } from '../types';
import { ChannelToggles } from './ChannelToggles';
import { palette, radii, spacing, typography } from '@/theme/tokens';

const TITLES: Record<EventGroup, string> = {
  replies: 'Replies',
  mentions: 'Mentions',
  sessions: 'Sessions',
  payments: 'Payments',
};

export function PreferenceGroup({
  group,
  value,
  onChannelChange,
}: {
  group: EventGroup;
  value: GroupPrefs;
  onChannelChange: (c: Channel, v: boolean) => void;
}) {
  return (
    <View style={styles.card} testID={`pref-group-${group}`}>
      <Text accessibilityRole="header" style={styles.title}>
        {TITLES[group]}
      </Text>
      <ChannelToggles value={value} onChange={onChannelChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
});
