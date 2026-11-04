import { useThemedStyles } from "@/theme/useThemedStyles";
import type { Palette } from "@/theme/tokens";
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hitSlop, radii, spacing } from '@/theme/tokens';
export interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  label?: string;
  testID?: string;
}
export function FloatingActionButton({
  onPress,
  accessibilityLabel = 'Create a new thread',
  label = '+',
  testID = 'forum-fab'
}: FloatingActionButtonProps) {
  const styles = useThemedStyles(createStyles);
  return <View pointerEvents="box-none" style={styles.container} testID={`${testID}-container`}>
      <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" hitSlop={hitSlop} onPress={onPress} style={styles.button} testID={testID}>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>;
}
const createStyles = (palette: Palette) => StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brand,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4
    }
  },
  label: {
    fontSize: 28,
    lineHeight: 32,
    color: palette.textInverse,
    fontWeight: '700'
  }
});
export default FloatingActionButton;
