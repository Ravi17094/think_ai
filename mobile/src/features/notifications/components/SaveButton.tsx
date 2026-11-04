import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function SaveButton({ saving, onPress }: { saving: boolean; onPress: () => void }) {
  return (
    <View>
      {saving ? (
        <View style={styles.button}><ActivityIndicator color={palette.textPrimary} accessibilityLabel="Saving notification preferences" accessibilityLiveRegion="polite" testID="save-preferences-saving" /></View>
      ) : (
        <Pressable
          style={styles.button}
          onPress={onPress}
          accessibilityLabel="Save notification preferences"
          accessibilityRole="button">
          <Text style={styles.text}>Save preferences</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.brand, paddingHorizontal: spacing.md },
  text: { ...typography.label, color: palette.textPrimary, fontSize: 15 },
});
