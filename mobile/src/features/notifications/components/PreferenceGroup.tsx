import { StyleSheet, Text, View } from 'react-native';

import { EventGroup, GroupPrefs, Channel } from '../types';
import { ChannelToggles } from './ChannelToggles';

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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
