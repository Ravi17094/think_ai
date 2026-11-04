import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typography } from '@/theme/tokens';
import type { UserRole } from '@/screens/onboarding/RoleSelectionScreen';

interface TourStep {
  title: string;
  description: string;
  role: UserRole[];
}

const tourSteps: TourStep[] = [
  {
    title: 'Your Dashboard',
    description: 'Track your courses and progress here',
    role: ['learner'],
  },
  {
    title: 'Create Courses',
    description: 'Use the course builder to create amazing content',
    role: ['instructor'],
  },
  {
    title: 'Help Students',
    description: 'Review assignments and answer questions',
    role: ['ta'],
  },
  {
    title: 'Manage Platform',
    description: 'Oversee users, courses, and settings',
    role: ['admin'],
  },
  {
    title: 'Community Forum',
    description: 'Connect with others and get help',
    role: ['learner', 'instructor', 'ta', 'admin'],
  },
];

interface Props {
  role: UserRole;
  onDismiss: () => void;
}

export function GuidedTourOverlay({ role, onDismiss }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const relevantSteps = tourSteps.filter((step) => step.role.includes(role));
  const step = relevantSteps[currentStep];

  const handleNext = () => {
    if (currentStep < relevantSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onDismiss();
    }
  };

  if (!step) {
    return null;
  }

  return (
    <View style={styles.overlay} testID="guided-tour">
      <View style={styles.tooltip}>
        <Text style={styles.stepIndicator}>
          {currentStep + 1} / {relevantSteps.length}
        </Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onDismiss} testID="tour-skip" accessibilityRole="button">
            <Text style={styles.skipText}>Skip tour</Text>
          </Pressable>
          <Pressable
            style={styles.nextButton}
            onPress={handleNext}
            testID="tour-next"
            accessibilityRole="button">
            <Text style={styles.nextButtonText}>
              {currentStep === relevantSteps.length - 1 ? 'Got it' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  tooltip: {
    backgroundColor: palette.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    maxWidth: 320,
    gap: spacing.sm,
  },
  stepIndicator: {
    ...typography.caption,
    color: palette.brand,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  description: {
    ...typography.body,
    color: palette.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  skipText: {
    ...typography.label,
    color: palette.textMuted,
  },
  nextButton: {
    backgroundColor: palette.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  nextButtonText: {
    ...typography.label,
    color: palette.textInverse,
  },
});

export default GuidedTourOverlay;
