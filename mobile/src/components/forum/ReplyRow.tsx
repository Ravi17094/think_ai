import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, hitSlop, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';
import type { ThreadReply, VoteDirection } from '@/types/community';
import { MentionText } from './MentionText';

export interface ReplyRowProps {
  reply: ThreadReply;
  /** Indent level (0 = top-level), already capped by the list. */
  depth: number;
  vote: VoteDirection;
  onVote: (direction: VoteDirection) => void;
  onReplyTo?: (reply: ThreadReply) => void;
  isActiveTarget?: boolean;
  testID: string;
}

function ReplyVoteControl({
  vote,
  onVote,
  testID,
}: {
  vote: VoteDirection;
  onVote: (direction: VoteDirection) => void;
  testID: string;
}) {
  return (
    <View style={styles.voteRow} testID={`${testID}-votes`}>
      <Pressable
        accessibilityLabel={vote === 'up' ? 'Remove upvote' : 'Upvote reply'}
        accessibilityRole="button"
        accessibilityState={{ selected: vote === 'up' }}
        hitSlop={hitSlop}
        onPress={() => onVote('up')}
        style={styles.voteButton}
        testID={`${testID}-vote-up`}>
        <Text style={[styles.voteArrow, vote === 'up' && styles.upSelected]}>▲</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={vote === 'down' ? 'Remove downvote' : 'Downvote reply'}
        accessibilityRole="button"
        accessibilityState={{ selected: vote === 'down' }}
        hitSlop={hitSlop}
        onPress={() => onVote('down')}
        style={styles.voteButton}
        testID={`${testID}-vote-down`}>
        <Text style={[styles.voteArrow, vote === 'down' && styles.downSelected]}>▼</Text>
      </Pressable>
    </View>
  );
}

/** One reply row with depth indentation, local votes and a nested-reply action. */
export function ReplyRow({
  reply,
  depth,
  vote,
  onVote,
  onReplyTo,
  isActiveTarget = false,
  testID,
}: ReplyRowProps) {
  return (
    <View
      style={[
        styles.row,
        { marginLeft: depth * REPLY_INDENT },
        isActiveTarget && styles.rowActive,
      ]}
      testID={testID}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, depth > 0 && styles.avatarSmall]}>
          <Text style={[styles.avatarInitials, depth > 0 && styles.avatarInitialsSmall]}>
            {reply.author.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('')}
          </Text>
        </View>
        <Text style={styles.author} numberOfLines={1}>
          {reply.author.name}
          {reply.author.username ? (
            <Text style={styles.handle}> @{reply.author.username}</Text>
          ) : null}
        </Text>
        <Text style={styles.timestamp}>{formatRelativeTime(reply.createdAt)}</Text>
      </View>

      <MentionText text={reply.body} testID={`${testID}-body`} />

      <View style={styles.footerRow}>
        <ReplyVoteControl onVote={onVote} testID={testID} vote={vote} />
        {onReplyTo ? (
          <Pressable
            accessibilityLabel={`Reply to ${reply.author.name}`}
            accessibilityRole="button"
            hitSlop={hitSlop}
            onPress={() => onReplyTo(reply)}
            style={({ pressed }) => [styles.replyAction, pressed && styles.pressed]}
            testID={`${testID}-reply-to`}>
            <Text style={styles.replyActionLabel}>Reply</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Extra indent applied per nesting level (capped by the parent list). */
export const REPLY_INDENT = spacing.lg;

const styles = StyleSheet.create({
  row: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  rowActive: {
    borderColor: palette.brand,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.brandAlt,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  avatarSmall: {
    height: 22,
    width: 22,
  },
  avatarInitials: {
    ...typography.caption,
    color: palette.textInverse,
    fontWeight: '700',
  },
  avatarInitialsSmall: {
    fontSize: 10,
  },
  author: {
    ...typography.label,
    color: palette.textPrimary,
    flexShrink: 1,
  },
  handle: {
    color: palette.textSecondary,
    fontWeight: '400',
  },
  timestamp: {
    ...typography.caption,
    color: palette.textMuted,
    marginLeft: 'auto',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  voteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 32,
  },
  voteArrow: {
    ...typography.label,
    color: palette.textMuted,
    fontSize: 13,
  },
  upSelected: {
    color: palette.success,
  },
  downSelected: {
    color: palette.danger,
  },
  replyAction: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  replyActionLabel: {
    ...typography.label,
    color: palette.brand,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default ReplyRow;
