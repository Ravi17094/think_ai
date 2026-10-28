import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

const OPTIONS = [
  'Encapsulation',
  'Inheritance',
  'Compilation',
  'Indexing',
] as const;

export function AssessmentScreen({
  navigation,
  route,
}: ScreenProps<'Assessment'>) {
  const [selected, setSelected] = useState<number | null>(null);
  const correctIndex = useMemo(() => 0, []);

  const submit = () => {
    const score = selected === correctIndex ? 100 : 0;
    navigation.replace('Results', {
      assessmentId: route.params.assessmentId,
      score,
      passed: score >= 70,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} testID="assessment-form">
      <Text style={styles.title}>Knowledge check</Text>
      <Text style={styles.prompt}>
        Which OOP principle keeps an object&apos;s state private?
      </Text>

      <View style={styles.options}>
        {OPTIONS.map((option, index) => {
          const active = selected === index;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              key={option}
              onPress={() => setSelected(index)}
              style={[styles.option, active && styles.optionActive]}
              testID={`answer-${index}`}>
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: selected === null }}
        disabled={selected === null}
        onPress={submit}
        style={[styles.submit, selected === null && styles.submitDisabled]}
        testID="submit-assessment">
        <Text style={styles.submitLabel}>Submit assessment</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.title, color: palette.textPrimary },
  prompt: { ...typography.body, color: palette.textSecondary },
  options: { gap: spacing.sm },
  option: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  optionActive: { borderColor: palette.brand, backgroundColor: palette.surfaceMuted },
  optionLabel: { ...typography.body, color: palette.textPrimary },
  optionLabelActive: { color: palette.accent, fontWeight: '700' },
  submit: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
  },
  submitDisabled: { opacity: 0.5 },
  submitLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
});

export default AssessmentScreen;
