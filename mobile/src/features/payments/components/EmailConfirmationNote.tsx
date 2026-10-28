import { StyleSheet, Text, View } from 'react-native';

export function EmailConfirmationNote({ email }: { email: string }) {
  return (
    <View style={styles.container}>
      <Text
        accessibilityLiveRegion="polite"
        style={styles.text}
        testID="email-confirmation-note">
        Receipt sent to {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  text: {
    color: '#666',
    fontSize: 14,
  },
});
