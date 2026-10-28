import { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';
import type { BookmarkRecord } from '@/types/community';

export interface BookmarkRowProps {
  record: BookmarkRecord;
  onOpen?: (record: BookmarkRecord) => void;
  onRemove?: (record: BookmarkRecord) => void;
  isRemoving?: boolean;
  testID?: string;
}

/** Distance the row must travel left before the remove action commits. */
export const SWIPE_THRESHOLD = 90;
const MAX_SWIPE = 140;

/**
 * Bookmark row with swipe-left-to-remove (PanResponder) plus an always
 * visible Remove button so the action is reachable without gestures.
 */
export function BookmarkRow({
  record,
  onOpen,
  onRemove,
  isRemoving = false,
  testID = 'bookmark-row',
}: BookmarkRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const removeRef = useRef(onRemove);
  removeRef.current = onRemove;

  const rowId = `${testID}-${record.discussionId}`;

  useEffect(() => {
    if (isRemoving) {
      Animated.timing(translateX, {
        toValue: -MAX_SWIPE,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [isRemoving, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dx < 0) {
          translateX.setValue(Math.max(gesture.dx, -MAX_SWIPE));
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -MAX_SWIPE,
            duration: 160,
            useNativeDriver: true,
          }).start(() => removeRef.current?.(record));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const discussion = record.discussion;
  const replyCount = discussion.replyCount ?? 0;
  const score = discussion.score ?? discussion.upvotes ?? 0;

  return (
    <View style={styles.container} testID={rowId}>
      <View style={styles.removeBackdrop} testID={`${rowId}-remove-hint`}>
        <Text style={styles.removeHint}>Remove</Text>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.row, { transform: [{ translateX }] }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen?.(record)}
          style={styles.main}
          testID={`${rowId}-open`}>
          <Text numberOfLines={1} style={styles.title} testID={`${rowId}-title`}>
            {discussion.title}
          </Text>
          <Text numberOfLines={2} style={styles.excerpt}>
            {discussion.excerpt ?? discussion.body ?? ''}
          </Text>
          <Text style={styles.meta} testID={`${rowId}-meta`}>
            {discussion.author?.name ?? 'Unknown'} · 💬 {replyCount} · ▲ {score}
            {discussion.createdAt
              ? ` · ${formatRelativeTime(discussion.createdAt)}`
              : ''}
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel={`Remove bookmark ${discussion.title}`}
          accessibilityRole="button"
          disabled={isRemoving}
          onPress={() => onRemove?.(record)}
          style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
          testID={`${rowId}-remove`}>
          <Text style={styles.removeLabel}>{isRemoving ? '…' : 'Remove'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.danger,
    overflow: 'hidden',
  },
  removeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  removeHint: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingLeft: spacing.sm,
    minHeight: 88,
  },
  main: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    gap: spacing.xxs,
  },
  title: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  excerpt: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  meta: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: spacing.xxs,
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.danger,
    minHeight: 88,
    paddingHorizontal: spacing.sm,
    minWidth: 76,
  },
  removeLabel: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default BookmarkRow;
