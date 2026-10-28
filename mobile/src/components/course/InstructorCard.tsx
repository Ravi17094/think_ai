import { Image, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import type { Instructor } from '@/types';

export interface InstructorCardProps {
  instructor: Instructor;
  testID?: string;
}

export function InstructorCard({
  instructor,
  testID = 'instructor-card',
}: InstructorCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={instructor.name}
        source={{ uri: instructor.avatarUrl }}
        style={styles.avatar}
        testID={`${testID}-avatar`}
      />
      <View style={styles.body}>
        <Text style={styles.name} testID={`${testID}-name`}>
          {instructor.name}
        </Text>
        <Text style={styles.title}>{instructor.title}</Text>
        <Text style={styles.bio} testID={`${testID}-bio`}>
          {instructor.bio}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  title: {
    ...typography.caption,
    color: palette.accent,
  },
  bio: {
    ...typography.caption,
    color: palette.textSecondary,
    marginTop: spacing.xxs,
  },
});

export default InstructorCard;
