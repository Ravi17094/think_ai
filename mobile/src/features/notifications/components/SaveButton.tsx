import { ActivityIndicator, Button, View } from 'react-native';

export function SaveButton({ saving, onPress }: { saving: boolean; onPress: () => void }) {
  return (
    <View>
      {saving ? (
        <ActivityIndicator
          accessibilityLabel="Saving notification preferences"
          accessibilityLiveRegion="polite"
          testID="save-preferences-saving"
        />
      ) : (
        <Button
          title="Save Preferences"
          onPress={onPress}
          accessibilityLabel="Save notification preferences"
        />
      )}
    </View>
  );
}
