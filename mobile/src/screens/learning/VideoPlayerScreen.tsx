import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function VideoPlayerScreen({
  navigation,
  route,
}: ScreenProps<'VideoPlayer'>) {
  return (
    <SafeAreaView style={styles.safeArea} testID="video-player">
      <View style={styles.stage}>
        <Text style={styles.stageIcon}>VIDEO</Text>
        <Text style={styles.stageTitle}>Lesson player</Text>
        <Text style={styles.stageMeta}>
          Course {route.params.courseId}
          {route.params.lessonId ? ` - ${route.params.lessonId}` : ''}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate('Assessment', {
            assessmentId: route.params.courseId,
          })
        }
        style={styles.action}
        testID="take-assessment">
        <Text style={styles.actionLabel}>Take assessment</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: '#000000',
  },
  stageIcon: {
    fontSize: 24,
    letterSpacing: 4,
    color: palette.textPrimary,
  },
  stageTitle: { ...typography.subtitle, color: palette.textPrimary },
  stageMeta: { ...typography.caption, color: palette.textMuted },
  action: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
  },
  actionLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
});

export default VideoPlayerScreen;
