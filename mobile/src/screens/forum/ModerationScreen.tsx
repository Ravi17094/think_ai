import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog, ScreenHeader } from '@/components/common';
import { AuditLogList } from '@/components/moderation/AuditLogList';
import { FlagQueueTable } from '@/components/moderation/FlagQueueTable';
import { PreviewModal } from '@/components/moderation/PreviewModal';
import { UserPanel } from '@/components/moderation/UserPanel';
import { useModeration, type ModerationTab } from '@/hooks/useModeration';
import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';
import type {
  ContentTarget,
  FlagQueueRow,
  ModerationUser,
  UserPostSummary,
} from '@/types/community';

const TABS: { key: ModerationTab; label: string }[] = [
  { key: 'queue', label: 'Queue' },
  { key: 'users', label: 'Members' },
  { key: 'audit', label: 'Audit' },
];

type ConfirmState =
  | { kind: 'delete'; target: ContentTarget; title: string }
  | { kind: 'ban'; user: ModerationUser };

interface PreviewState {
  title: string;
  body: string;
  meta: string;
}

/**
 * Page 9 — Moderation Dashboard (`/forum/moderate`).
 *
 * Three tabs (flag queue, members, audit) over the moderation API, with
 * preview / hide / dismiss / soft-delete actions, member warn/ban/unban and
 * confirm dialogs for the destructive operations.
 */
export function ModerationScreen(_props: ScreenProps<'Moderation'>) {
  const {
    tab,
    setTab,
    rows,
    audit,
    users,
    allUserCount,
    userQuery,
    setUserQuery,
    selectedUser,
    posts,
    postsError,
    arePostsLoading,
    isLoading,
    isRefreshing,
    hasError,
    error,
    actionError,
    isActing,
    load,
    refresh,
    setVisibility,
    dismissFlag,
    deleteContent,
    moderateUser,
    selectUser,
  } = useModeration();

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const target = (row: FlagQueueRow): ContentTarget => ({
    id: row.id,
    type: row.type,
  });

  const handlePreviewFlag = (row: FlagQueueRow) =>
    setPreview({
      title: row.title,
      body: row.excerpt,
      meta: `${row.type === 'discussion' ? 'Thread' : 'Reply'} · ${
        row.severity
      } severity · ${row.reportCount} report${
        row.reportCount === 1 ? '' : 's'
      } · flagged ${formatRelativeTime(row.flaggedAt)} · by ${row.authorName}`,
    });

  const handlePreviewPost = (post: UserPostSummary) =>
    setPreview({
      title: post.title,
      body: post.excerpt,
      meta: `Post · ${formatRelativeTime(post.createdAt)} · 💬 ${post.replyCount}`,
    });

  const handleConfirm = async () => {
    if (!confirmState) {
      return;
    }
    const succeeded =
      confirmState.kind === 'delete'
        ? await deleteContent(confirmState.target)
        : await moderateUser('ban', confirmState.user.id);
    if (succeeded) {
      setConfirmState(null);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="moderation-screen">
      <ScreenHeader
        right={
          <Pressable
            accessibilityLabel="Refresh moderation data"
            accessibilityRole="button"
            onPress={refresh}
            testID="moderation-refresh">
            <Text style={styles.refreshLabel}>↻ Refresh</Text>
          </Pressable>
        }
        subtitle={`${rows.length} flagged item${rows.length === 1 ? '' : 's'} awaiting review`}
        testID="moderation-header"
        title="Moderation"
      />

      <View style={styles.tabs} testID="moderation-tabs">
        {TABS.map((entry) => {
          const isSelected = tab === entry.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              key={entry.key}
              onPress={() => setTab(entry.key)}
              style={[styles.tab, isSelected && styles.tabSelected]}
              testID={`moderation-tab-${entry.key}`}>
              <Text style={[styles.tabLabel, isSelected && styles.tabLabelSelected]}>
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {actionError ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={styles.banner}
          testID="moderation-action-error">
          {actionError}
        </Text>
      ) : null}

      {tab === 'queue' ? (
        <FlagQueueTable
          errorMessage={error ?? undefined}
          hasError={hasError && rows.length === 0}
          isActing={isActing}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onDelete={(row) =>
            setConfirmState({
              kind: 'delete',
              target: target(row),
              title: row.title,
            })
          }
          onDismiss={(row) => void dismissFlag(target(row))}
          onHide={(row) => void setVisibility(target(row), true)}
          onPreview={handlePreviewFlag}
          onRefresh={refresh}
          onRetry={() => void load('initial')}
          onShow={(row) => void setVisibility(target(row), false)}
          rows={rows}
        />
      ) : null}

      {tab === 'users' ? (
        <UserPanel
          allUserCount={allUserCount}
          arePostsLoading={arePostsLoading}
          isActing={isActing}
          isLoading={isLoading}
          onBan={(user) => setConfirmState({ kind: 'ban', user })}
          onPreviewPost={handlePreviewPost}
          onQueryChange={setUserQuery}
          onSelect={(user) => void selectUser(user?.id ?? null)}
          onUnban={(user) => void moderateUser('unban', user.id)}
          onWarn={(user) => void moderateUser('warn', user.id)}
          posts={posts}
          postsError={postsError}
          query={userQuery}
          selectedUser={selectedUser}
          users={users}
        />
      ) : null}

      {tab === 'audit' ? (
        <AuditLogList
          entries={audit}
          errorMessage={error ?? undefined}
          hasError={hasError && audit.length === 0}
          isLoading={isLoading}
          onRetry={() => void load('initial')}
        />
      ) : null}

      <PreviewModal
        body={preview?.body ?? ''}
        meta={preview?.meta}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        visible={preview !== null}
      />

      <ConfirmDialog
        confirmLabel={confirmState?.kind === 'delete' ? 'Delete' : 'Ban member'}
        errorMessage={actionError}
        isBusy={isActing}
        message={
          confirmState?.kind === 'delete'
            ? `"${confirmState.title}" will be hidden from the community and its flags resolved.`
            : confirmState?.kind === 'ban'
              ? `${confirmState.user.name} (@${confirmState.user.username}) will no longer be able to post.`
              : undefined
        }
        onCancel={() => {
          if (!isActing) {
            setConfirmState(null);
          }
        }}
        onConfirm={() => void handleConfirm()}
        testID="moderation-confirm"
        title={
          confirmState?.kind === 'delete' ? 'Delete this content?' : 'Ban this member?'
        }
        visible={confirmState !== null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  refreshLabel: {
    ...typography.label,
    color: palette.accent,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 40,
  },
  tabSelected: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  tabLabel: {
    ...typography.label,
    color: palette.textSecondary,
  },
  tabLabelSelected: {
    color: palette.textInverse,
    fontWeight: '700',
  },
  banner: {
    ...typography.label,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: palette.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.danger,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
});

export default ModerationScreen;
