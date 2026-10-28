import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function CertificateScreen({ route }: ScreenProps<'Certificate'>) {
  return (
    <SafeAreaView style={styles.safeArea} testID="certificate-view">
      <View style={styles.frame}>
        <Text style={styles.eyebrow}>Certificate of completion</Text>
        <Text style={styles.name}>ThinkZ Learner</Text>
        <Text style={styles.copy}>
          has successfully completed course {route.params.courseId}.
        </Text>
        <Text style={styles.id}>ID: {route.params.courseId}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  frame: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: palette.brand,
    backgroundColor: palette.surface,
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: { ...typography.label, color: palette.accent },
  name: { ...typography.display, color: palette.textPrimary },
  copy: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  id: { ...typography.mono, color: palette.textMuted },
});

export default CertificateScreen;
