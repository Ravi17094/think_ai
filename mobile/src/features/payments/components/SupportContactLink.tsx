import { Linking, StyleSheet, Text, View } from 'react-native';

export function SupportContactLink() {
  return (
    <View style={styles.wrap}>
      <Text>Need help? </Text>
      <Text
        accessibilityLabel="Email support at support@example.com"
        accessibilityRole="link"
        style={styles.link}
        onPress={() => Linking.openURL('mailto:support@example.com')}>
        support@example.com
      </Text>
      <Text> or </Text>
      <Text
        accessibilityLabel="Call support at plus 1 800 555 1234"
        accessibilityRole="link"
        style={styles.link}
        onPress={() => Linking.openURL('tel:+18005551234')}>
        +1-800-555-1234
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  link: {
    color: '#0066cc',
    textDecorationLine: 'underline',
  },
});
