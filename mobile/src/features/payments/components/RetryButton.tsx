import { Button } from 'react-native';

export function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      title="Retry Payment"
      onPress={onPress}
      accessibilityLabel="Retry payment"
    />
  );
}
