import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';
import type { ForumCategory } from '@/types';
import type { ThreadDetail, VoteDirection } from '@/types/community';
import { MentionText } from './MentionText';
import { SolvedToggle } from './SolvedToggle';
import { VoteButtons } from './VoteButtons';

export interface ThreadHeaderProps {
  thread: ThreadDetail;
  categories?: ForumCategory[];
  /** The signed-in user authored the thread → gets the solved toggle. */
  isAuthor: boolean;
  userVote: VoteDirection;
  onVote: (direction: VoteDirection) => void;
  onToggleSolved?: (solved: boolean) => void;
  isVoting?: boolean;
  isUpdatingSolved?: boolean;
  testID?: string;
}

/** Thread card: title, author meta, tags, solved state and vote controls. */
export function ThreadHeader({
  thread,
  categories = [],
  isAuthor,
  userVote,
  onVote,
  onToggleSolved,
  isVoting = false,
  isUpdatingSolved = false,
  testID = 'thread-header',
}: ThreadHeaderProps) {
  const category = categories.find((item) => item.id === thread.categoryId);

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.badgeRow}>
        {category ? (
          <Text style={[styles.category, { color: category.color }]}>
            {category.name}
          </Text>
        ) : null}
        <SolvedToggle
          canManage={isAuthor}
          isUpdating={isUpdatingSolved}
          onToggle={onToggleSolved}
          solved={thread.solved}
          testID={`${testID}-solved`}
        />
      </View>

      <Text
        accessibilityRole="header"
        style={styles.title}
        testID={`${testID}-title`}>
        {thread.title}
      </Text>

      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials(thread.author.name)}</Text>
        </View>
        <View style={styles.authorMeta}>
          <Text style={styles.authorName} testID={`${testID}-author`}>
            {thread.author.name}
            {thread.author.username ? (
              <Text style={styles.handle}> @{thread.author.username}</Text>
            ) : null}
          </Text>
          <Text style={styles.timestamp} testID={`${testID}-timestamp`}>
            {formatRelativeTime(thread.createdAt)} · {thread.views} views ·{' '}
            {thread.replyCount} replies
          </Text>
        </View>
        <VoteButtons
          disabled={isVoting}
          onVote={onVote}
          orientation="horizontal"
          score={thread.score}
          testID={`${testID}-votes`}
          userVote={userVote}
        />
      </View>

      <MentionText text={thread.body} testID={`${testID}-body`} />

      {thread.tags.length > 0 ? (
        <View style={styles.tagRow} testID={`${testID}-tags`}>
          {thread.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  category: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.brandAlt,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarInitials: {
    ...typography.label,
    color: palette.textInverse,
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    ...typography.label,
    color: palette.textPrimary,
  },
  handle: {
    color: palette.textSecondary,
    fontWeight: '400',
  },
  timestamp: {
    ...typography.caption,
    color: palette.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  tagText: {
    ...typography.caption,
    color: palette.textSecondary,
  },
});

export default ThreadHeader;
