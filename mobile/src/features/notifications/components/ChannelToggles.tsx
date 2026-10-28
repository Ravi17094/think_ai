import { StyleSheet, Switch, Text, View } from 'react-native';

import { Channel, GroupPrefs } from '../types';

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
          <Text>{LABELS[c]}</Text>
          <Switch
            accessibilityLabel={`${LABELS[c]} notifications`}
            accessibilityRole="switch"
            onValueChange={(v) => onChange(c, v)}
            value={value[c]}
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
    gap: 8,
  },
  toggle: {
    alignItems: 'center',
    gap: 4,
  },
});
