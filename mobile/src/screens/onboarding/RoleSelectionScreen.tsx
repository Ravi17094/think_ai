import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {spacing, typography} from '@/theme/tokens';
import type { Palette } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type UserRole = 'learner' | 'instructor' | 'ta' | 'admin';

interface RoleCard {
  role: UserRole;
  title: string;
  description: string;
  emoji: string;
}

const roles: RoleCard[] = [
  {
    role: 'learner',
    title: 'Learner',
    description: 'Take courses and track your progress',
    emoji: '🎓',
  },
  {
    role: 'instructor',
    title: 'Instructor',
    description: 'Create and manage courses',
    emoji: '👨‍🏫',
  },
  {
    role: 'ta',
    title: 'TA',
    description: 'Assist instructors and students',
    emoji: '🤝',
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Manage platform and users',
    emoji: '⚙️',
  },
];

interface Props {
  onRoleSelected: (role: UserRole) => void;
}

export function RoleSelectionScreen({ onRoleSelected }: Props) {
  const styles = useThemedStyles(createStyles);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelected(selectedRole);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} testID="role-selection">
      <View style={styles.header}>
        <Text style={styles.title}>Choose your role</Text>
        <Text style={styles.subtitle}>Select how you'll use Thinkz AI</Text>
      </View>

      <View style={styles.cardsContainer}>
        {roles.map((roleCard) => (
          <Pressable
            key={roleCard.role}
            style={[
              styles.card,
              selectedRole === roleCard.role && styles.cardSelected,
            ]}
            onPress={() => setSelectedRole(roleCard.role)}
            testID={`role-card-${roleCard.role}`}
            accessibilityRole="button"
            accessibilityLabel={`${roleCard.title}, ${roleCard.description}`}>
            <Text style={styles.cardEmoji}>{roleCard.emoji}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{roleCard.title}</Text>
              <Text style={styles.cardDescription}>{roleCard.description}</Text>
            </View>
            {selectedRole === roleCard.role && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedRole}
          testID="role-continue"
          accessibilityRole="button"
          accessibilityLabel="Continue">
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    color: palette.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.border,
    gap: spacing.md,
  },
  cardSelected: {
    borderColor: palette.brand,
    backgroundColor: palette.surfaceMuted,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.subtitle,
    color: palette.textPrimary,
    marginBottom: 2,
  },
  cardDescription: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  checkmark: {
    fontSize: 20,
    color: palette.brand,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  continueButton: {
    backgroundColor: palette.brand,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...typography.label,
    color: palette.textInverse,
  },
});

export default RoleSelectionScreen;
