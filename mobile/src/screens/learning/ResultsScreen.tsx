import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function ResultsScreen({ navigation, route }: ScreenProps<'Results'>) {
  const { score, passed, assessmentId } = route.params;

  return (
    <SafeAreaView style={styles.safeArea} testID="assessment-results">
      <Text style={styles.eyebrow}>{passed ? 'Passed' : 'Keep practising'}</Text>
      <Text style={styles.score} testID="score-value">
        {score}%
      </Text>
      <Text style={styles.copy}>
        {passed
          ? 'You met the pass mark. Your certificate is ready.'
          : 'Review the lesson and retake the assessment when you are ready.'}
      </Text>

      <View style={styles.actions}>
        {passed ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Certificate', { courseId: assessmentId })}
            style={styles.primary}
            testID="view-certificate">
            <Text style={styles.primaryLabel}>View certificate</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.replace('Assessment', { assessmentId })
          }
          style={styles.secondary}
          testID="retake-assessment">
          <Text style={styles.secondaryLabel}>Retake assessment</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  eyebrow: { ...typography.label, color: palette.accent },
  score: { ...typography.display, color: palette.textPrimary },
  copy: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  primary: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
  },
  primaryLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  secondary: { alignItems: 'center', paddingVertical: spacing.sm },
  secondaryLabel: { ...typography.label, color: palette.textSecondary },
});

export default ResultsScreen;
