import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { CourseModule } from '@/types';

export const ACCORDION_ANIMATION_MS = 220;

export interface ModuleAccordionProps {
  modules: CourseModule[];
  /** Module expanded on first render — used for deep links. */
  initiallyExpandedId?: string | null;
  onToggle?: (moduleId: string) => void;
  testID?: string;
}

function Chevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <Text style={[styles.chevron, isExpanded && styles.chevronExpanded]}>
      ›
    </Text>
  );
}

export function ModuleAccordion({
  modules,
  initiallyExpandedId = null,
  onToggle,
  testID = 'module-accordion',
}: ModuleAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    initiallyExpandedId
  );
  const animations = useRef(
    new Map<string, Animated.Value>()
  ).current;

  useEffect(() => {
    if (initiallyExpandedId) {
      setExpandedId((current) => current ?? initiallyExpandedId);
    }
  }, [initiallyExpandedId]);

  const progressFor = useCallback(
    (moduleId: string): Animated.Value => {
      const existing = animations.get(moduleId);
      if (existing) {
        return existing;
      }
      const created = new Animated.Value(
        moduleId === expandedId ? 1 : 0
      );
      animations.set(moduleId, created);
      return created;
    },
    [animations, expandedId]
  );

  const handleToggle = useCallback(
    (moduleId: string) => {
      const next = expandedId === moduleId ? null : moduleId;
      setExpandedId(next);
      onToggle?.(moduleId);

      const progress = progressFor(moduleId);
      Animated.timing(progress, {
        toValue: next === moduleId ? 1 : 0,
        duration: ACCORDION_ANIMATION_MS,
        useNativeDriver: false,
      }).start();
    },
    [expandedId, onToggle, progressFor]
  );

  return (
    <View testID={testID}>
      {modules.map((module, index) => {
        const isExpanded = expandedId === module.id;
        const progress = progressFor(module.id);

        return (
          <View key={module.id} style={styles.module} testID={`${testID}-module-${index}`}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={module.title}
              hitSlop={hitSlop}
              onPress={() => handleToggle(module.id)}
              style={styles.header}
              testID={`${testID}-header-${index}`}>
              <View style={styles.headerText}>
                <Text style={styles.moduleIndex}>
                  Module {index + 1} · {module.lessons.length} lessons ·{' '}
                  {module.durationMinutes} min
                </Text>
                <Text style={styles.moduleTitle}>{module.title}</Text>
              </View>
              <Chevron isExpanded={isExpanded} />
            </Pressable>

            <Animated.View
              style={[
                styles.body,
                {
                  opacity: progress,
                  height: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 520],
                  }),
                },
              ]}
              testID={`${testID}-body-${index}`}>
              <Text style={styles.description}>{module.description}</Text>
              {module.lessons.map((lesson, lessonIndex) => (
                <View
                  key={lesson.id}
                  style={styles.lesson}
                  testID={`${testID}-lesson-${index}-${lessonIndex}`}>
                  <Text style={styles.lessonType}>{lesson.type.toUpperCase()}</Text>
                  <Text style={styles.lessonTitle} numberOfLines={2}>
                    {lesson.title}
                  </Text>
                  <Text style={styles.lessonDuration}>
                    {lesson.durationMinutes} min
                  </Text>
                </View>
              ))}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  module: {
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  moduleIndex: {
    ...typography.caption,
    color: palette.accent,
  },
  moduleTitle: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  chevron: {
    fontSize: 22,
    color: palette.textSecondary,
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  description: {
    ...typography.caption,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  lessonType: {
    ...typography.caption,
    color: palette.brand,
    width: 56,
  },
  lessonTitle: {
    ...typography.caption,
    color: palette.textPrimary,
    flex: 1,
  },
  lessonDuration: {
    ...typography.caption,
    color: palette.textMuted,
  },
});

export default ModuleAccordion;
