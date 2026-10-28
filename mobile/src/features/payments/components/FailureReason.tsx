import { StyleSheet, Text, View } from 'react-native';

import { FailureReasonKey, failureMessages } from '../failure';

export function FailureReason({ type }: { type: FailureReasonKey }) {
  const m = failureMessages[type] || failureMessages.unknown;
  return (
    <View accessibilityLiveRegion="polite" style={styles.wrap}>
      <Text
        accessibilityRole="header"
        style={styles.title}
        testID={`failure-title-${type}`}>
        {m.title}
      </Text>
      <Text style={styles.body} testID={`failure-body-${type}`}>
        {m.body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    textAlign: 'center',
    color: '#666',
  },
});
