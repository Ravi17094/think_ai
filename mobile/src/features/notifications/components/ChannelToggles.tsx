import { StyleSheet, Switch, Text, View } from 'react-native';

import { Channel, GroupPrefs } from '../types';
import { palette, spacing, typography } from '@/theme/tokens';

const LABELS: Record<Channel, string> = { email: 'Email', inApp: 'In-App', sms: 'SMS' };

export function ChannelToggles({
  value,
  onChange,
}: {
  value: GroupPrefs;
  onChange: (c: Channel, v: boolean) => void;
}) {
  const channels: Channel[] = ['email', 'inApp', 'sms'];
  return (
    <View style={styles.row}>
      {channels.map((c) => (
        <View key={c} style={styles.toggle} testID={`channel-toggle-${c}`}>
          <Text style={styles.label}>{LABELS[c]}</Text>
          <Switch
            accessibilityLabel={`${LABELS[c]} notifications`}
            accessibilityRole="switch"
            onValueChange={(v) => onChange(c, v)}
            value={value[c]}
            trackColor={{ false: palette.borderStrong, true: palette.brand }}
            thumbColor={palette.textPrimary}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.xs,
  },
  toggle: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  label: { ...typography.label, color: palette.textSecondary },
});
