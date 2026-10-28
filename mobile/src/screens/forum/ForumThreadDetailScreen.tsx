import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, ErrorState, ScreenHeader } from '@/components/common';
import { ReplyList } from '@/components/forum/ReplyList';
import { RichTextEditor } from '@/components/forum/RichTextEditor';
import { ThreadDetailSkeleton } from '@/components/forum/ThreadDetailSkeleton';
import { ThreadHeader } from '@/components/forum/ThreadHeader';
import { useReplyVotes } from '@/hooks/useReplyVotes';
import { useSession } from '@/hooks/useSession';
import { useThreadDetail } from '@/hooks/useThreadDetail';
import type { ScreenProps } from '@/navigation/types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

/**
 * Page 6 — Forum Thread Detail (`/forum/threads/:id`).
 *
 * Thread card + nested replies in one FlatList, reply composer with `@`
 * mentions, optimistic voting/solved mutations and a skeleton loader for the
 * initial fetch.
 */
export function ForumThreadDetailScreen({ route }: ScreenProps<'ForumThread'>) {
  const { threadId } = route.params;
  const session = useSession();
  const {
    thread,
    replies,
    categories,
    isLoading,
    isRefreshing,
    hasError,
    error,
    actionError,
    isSubmittingReply,
    isVoting,
    isUpdatingSolved,
    load,
    refresh,
    vote,
    setSolved,
    submitReply,
  } = useThreadDetail(threadId);
  const { votes, vote: voteReply } = useReplyVotes();

  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const activeReply = replies.find((reply) => reply.id === activeReplyId) ?? null;

  const handleSubmitReply = useCallback(async () => {
    const body = replyBody.trim();
    if (!body) {
      return;
    }
    setReplyError(null);
    try {
      await submitReply(body, activeReplyId);
      setReplyBody('');
      setActiveReplyId(null);
    } catch (cause) {
      setReplyError(
        cause instanceof Error ? cause.message : 'Could not post the reply.'
      );
    }
  }, [activeReplyId, replyBody, submitReply]);

  const isAuthor = thread !== null && thread.authorId === session.userId;

  const renderContent = () => {
    if (isLoading && thread === null) {
      return <ThreadDetailSkeleton testID="thread-detail-skeleton" />;
    }

    if (hasError && thread === null) {
      return (
        <ErrorState
          message={error ?? 'Unable to load this thread.'}
          onRetry={() => void load('initial')}
          testID="thread-detail-error"
        />
      );
    }

    return (
      <ReplyList
        activeReplyId={activeReplyId}
        errorMessage={error ?? undefined}
        hasError={hasError}
        isRefreshing={isRefreshing}
        listFooter={
          <View style={styles.composer} testID="reply-composer">
            {activeReply ? (
              <View style={styles.replyingChip} testID="replying-chip">
                <Text style={styles.replyingText}>
                  Replying to @{activeReply.author.username ?? activeReply.author.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveReplyId(null)}
                  testID="cancel-reply-target">
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}

            <RichTextEditor
              errorMessage={replyError}
              label="Your reply"
              mentions
              minHeight={96}
              onChangeText={setReplyBody}
              placeholder="Write a reply… type @ to mention a member"
              testID="reply-editor"
              value={replyBody}
            />

            <AppButton
              disabled={!replyBody.trim()}
              loading={isSubmittingReply}
              loadingLabel="Posting…"
              onPress={() => void handleSubmitReply()}
              testID="submit-reply"
              title="Post reply"
            />
          </View>
        }
        listHeader={
          <View style={styles.headerSlot}>
            {actionError ? (
              <Text
                accessibilityLiveRegion="assertive"
                style={styles.actionError}
                testID="thread-action-error">
                {actionError}
              </Text>
            ) : null}

            {thread ? (
              <ThreadHeader
                categories={categories}
                isAuthor={isAuthor}
                isUpdatingSolved={isUpdatingSolved}
                isVoting={isVoting}
                onToggleSolved={(solved) => void setSolved(solved)}
                onVote={(direction) => void vote(direction)}
                thread={thread}
                userVote={thread.userVote}
              />
            ) : null}

            <Text style={styles.repliesTitle} testID="replies-title">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          </View>
        }
        onRefresh={refresh}
        onReplyTo={(reply) => setActiveReplyId(reply.id)}
        onRetry={() => void load('initial')}
        onVoteReply={(replyId, direction) => void voteReply(replyId, direction)}
        replies={replies}
        votes={votes}
      />
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="forum-thread-detail">
      <ScreenHeader
        subtitle={thread ? thread.title : 'Loading thread…'}
        testID="thread-screen-header"
        title="Thread"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
  },
  headerSlot: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  actionError: {
    ...typography.label,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: palette.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.danger,
    padding: spacing.sm,
  },
  repliesTitle: {
    ...typography.subtitle,
    color: palette.textPrimary,
  },
  composer: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  replyingChip: {
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  replyingText: {
    ...typography.caption,
    color: palette.textSecondary,
    flexShrink: 1,
  },
  cancelLabel: {
    ...typography.label,
    color: palette.danger,
    marginLeft: spacing.sm,
  },
});

export default ForumThreadDetailScreen;
