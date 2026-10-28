import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, Skeleton } from '@/components/common';
import { SearchInput } from '@/components/search/SearchInput';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';
import type { ModerationUser, UserPostSummary } from '@/types/community';

export interface UserPanelProps {
  users: ModerationUser[];
  /** Number of members before the search filter was applied. */
  allUserCount: number;
  query: string;
  onQueryChange: (next: string) => void;
  selectedUser: ModerationUser | null;
  posts: UserPostSummary[];
  postsError: string | null;
  arePostsLoading: boolean;
  onSelect: (user: ModerationUser | null) => void;
  onWarn: (user: ModerationUser) => void;
  onBan: (user: ModerationUser) => void;
  onUnban: (user: ModerationUser) => void;
  onPreviewPost?: (post: UserPostSummary) => void;
  isActing?: boolean;
  isLoading?: boolean;
  testID?: string;
}

function StatusChips({ user }: { user: ModerationUser }) {
  return (
    <View style={styles.chipRow}>
      <View style={[styles.chip, user.banned ? styles.chipDanger : styles.chipOk]}>
        <Text style={styles.chipText}>{user.banned ? 'Banned' : 'Active'}</Text>
      </View>
      {user.warned ? (
        <View style={[styles.chip, styles.chipWarn]}>
          <Text style={styles.chipText}>Warned</Text>
        </View>
      ) : null}
      {user.muted ? (
        <View style={[styles.chip, styles.chipWarn]}>
          <Text style={styles.chipText}>Muted</Text>
        </View>
      ) : null}
      <View style={styles.chip}>
        <Text style={styles.chipText}>{user.role}</Text>
      </View>
    </View>
  );
}

function PostsSection({
  user,
  posts,
  postsError,
  arePostsLoading,
  onPreviewPost,
  testID,
}: {
  user: ModerationUser;
  posts: UserPostSummary[];
  postsError: string | null;
  arePostsLoading: boolean;
  onPreviewPost?: (post: UserPostSummary) => void;
  testID: string;
}) {
  if (arePostsLoading) {
    return (
      <View testID={`${testID}-posts-skeleton`}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={12} width="90%" />
        <Skeleton height={14} width="52%" />
      </View>
    );
  }

  if (postsError) {
    return <ErrorState message={postsError} />;
  }

  if (posts.length === 0) {
    return (
      <Text style={styles.emptyText} testID={`${testID}-posts-empty`}>
        {user.username} has not posted anything yet.
      </Text>
    );
  }

  return (
    <View style={styles.postsList} testID={`${testID}-posts`}>
      {posts.map((post, index) => (
        <View key={post.id} style={styles.postRow}>
          <View style={styles.postMain}>
            <Text
              numberOfLines={1}
              style={styles.postTitle}
              testID={`${testID}-post-${index}-title`}>
              {post.title}
            </Text>
            <Text numberOfLines={2} style={styles.postExcerpt}>
              {post.excerpt}
            </Text>
            <Text style={styles.postMeta}>
              {formatRelativeTime(post.createdAt)} · 💬 {post.replyCount}
              {post.solved ? ' · ✓ solved' : ''}
              {post.hidden ? ' · hidden' : ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onPreviewPost?.(post)}
            style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}
            testID={`${testID}-post-${index}-preview`}>
            <Text style={styles.previewLabel}>Preview</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/**
 * Members tab: searchable user list plus the selected member's detail panel
 * with warn / ban / unban actions and their recent posts.
 */
export function UserPanel({
  users,
  allUserCount,
  query,
  onQueryChange,
  selectedUser,
  posts,
  postsError,
  arePostsLoading,
  onSelect,
  onWarn,
  onBan,
  onUnban,
  onPreviewPost,
  isActing = false,
  isLoading = false,
  testID = 'user-panel',
}: UserPanelProps) {
  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={selectedUser ? [] : users}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        selectedUser ? null : isLoading ? (
          <View testID={`${testID}-skeleton`}>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        ) : users.length === 0 ? (
          <EmptyState
            icon="👥"
            message={
              query
                ? 'No members match your search.'
                : 'No members available yet.'
            }
            testID={`${testID}-empty`}
            title="No members"
          />
        ) : null
      }
      ListHeaderComponent={
        <View style={styles.headerSlot}>
          {selectedUser ? (
            <View style={styles.detailCard} testID={`${testID}-detail`}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelect(null)}
                testID={`${testID}-back`}>
                <Text style={styles.backLabel}>← All members</Text>
              </Pressable>

              <Text style={styles.detailName} testID={`${testID}-detail-name`}>
                {selectedUser.name}
              </Text>
              <Text style={styles.detailHandle}>
                @{selectedUser.username}
                {selectedUser.email ? ` · ${selectedUser.email}` : ''}
              </Text>

              <StatusChips user={selectedUser} />

              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isActing}
                  onPress={() => onWarn(selectedUser)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.pressed,
                    isActing && styles.disabled,
                  ]}
                  testID={`${testID}-warn`}>
                  <Text style={styles.actionLabel}>Warn</Text>
                </Pressable>

                {selectedUser.banned ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isActing}
                    onPress={() => onUnban(selectedUser)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.actionOk,
                      pressed && styles.pressed,
                      isActing && styles.disabled,
                    ]}
                    testID={`${testID}-unban`}>
                    <Text style={styles.actionLabel}>Unban</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isActing}
                    onPress={() => onBan(selectedUser)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.actionDanger,
                      pressed && styles.pressed,
                      isActing && styles.disabled,
                    ]}
                    testID={`${testID}-ban`}>
                    <Text style={[styles.actionLabel, styles.dangerLabel]}>
                      Ban
                    </Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.sectionTitle} testID={`${testID}-posts-title`}>
                Recent posts
              </Text>
              <PostsSection
                arePostsLoading={arePostsLoading}
                onPreviewPost={onPreviewPost}
                posts={posts}
                postsError={postsError}
                testID={testID}
                user={selectedUser}
              />
            </View>
          ) : (
            <View>
              <SearchInput
                onChangeText={onQueryChange}
                placeholder="Search members by name, username or email"
                testID={`${testID}-search`}
                value={query}
              />
              <Text style={styles.countLabel} testID={`${testID}-count`}>
                {users.length} of {allUserCount} members
              </Text>
            </View>
          )}
        </View>
      }
      testID={testID}
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => void onSelect(item)}
          style={({ pressed }) => [styles.userRow, pressed && styles.pressed]}
          testID={`${testID}-user-${index}`}>
          <View style={styles.userMain}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.userHandle} numberOfLines={1}>
              @{item.username}
              {item.email ? ` · ${item.email}` : ''}
            </Text>
          </View>
          {item.banned ? (
            <Text style={styles.bannedTag}>Banned</Text>
          ) : item.warned ? (
            <Text style={styles.warnedTag}>Warned</Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  headerSlot: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  countLabel: {
    ...typography.caption,
    color: palette.textMuted,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    minHeight: 56,
  },
  userMain: {
    flex: 1,
  },
  userName: {
    ...typography.label,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  userHandle: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  bannedTag: {
    ...typography.caption,
    color: palette.danger,
    fontWeight: '700',
  },
  warnedTag: {
    ...typography.caption,
    color: palette.warning,
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  backLabel: {
    ...typography.label,
    color: palette.accent,
  },
  detailName: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  detailHandle: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  chipOk: {
    borderColor: palette.success,
  },
  chipWarn: {
    borderColor: palette.warning,
  },
  chipDanger: {
    borderColor: palette.danger,
  },
  chipText: {
    ...typography.caption,
    color: palette.textSecondary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  actionDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderColor: palette.danger,
  },
  actionOk: {
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: palette.success,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.8,
  },
  actionLabel: {
    ...typography.label,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  dangerLabel: {
    color: palette.danger,
  },
  sectionTitle: {
    ...typography.label,
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
  postsList: {
    gap: spacing.xs,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
  },
  postMain: {
    flex: 1,
    gap: spacing.xxs,
  },
  postTitle: {
    ...typography.label,
    color: palette.textPrimary,
  },
  postExcerpt: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  postMeta: {
    ...typography.caption,
    color: palette.textMuted,
  },
  previewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  previewLabel: {
    ...typography.caption,
    color: palette.accent,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.caption,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
});

export default UserPanel;
