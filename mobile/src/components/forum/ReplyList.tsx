import type { ReactElement } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState, ErrorState } from '@/components/common';
import { palette, spacing } from '@/theme/tokens';
import type { ThreadReply, VoteDirection } from '@/types/community';
import { ReplyRow } from './ReplyRow';
import { ThreadDetailSkeleton } from './ThreadDetailSkeleton';

/** Nesting deeper than this renders at the max indent (keeps text readable). */
export const MAX_REPLY_DEPTH = 3;

export interface ReplyListProps {
  replies: ThreadReply[];
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  /** Device-local vote per reply id (comments have no server votes). */
  votes: Record<string, VoteDirection>;
  onVoteReply: (replyId: string, direction: VoteDirection) => void;
  onReplyTo?: (reply: ThreadReply) => void;
  activeReplyId?: string | null;
  listHeader?: ReactElement | null;
  listFooter?: ReactElement | null;
  testID?: string;
}

export function replyDepths(replies: ThreadReply[]): Map<string, number> {
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  const depths = new Map<string, number>();

  const depthOf = (reply: ThreadReply, guard = 0): number => {
    if (depths.has(reply.id)) {
      return depths.get(reply.id) ?? 0;
    }
    const parent = reply.parentId ? byId.get(reply.parentId) : undefined;
    const depth =
      !parent || guard >= MAX_REPLY_DEPTH
        ? 0
        : Math.min(depthOf(parent, guard + 1) + 1, MAX_REPLY_DEPTH);
    depths.set(reply.id, depth);
    return depth;
  };

  for (const reply of replies) {
    depthOf(reply);
  }
  return depths;
}

/** FlatList of replies with indentation, thread header/footer slots and votes. */
export function ReplyList({
  replies,
  isLoading = false,
  hasError = false,
  errorMessage,
  onRetry,
  isRefreshing = false,
  onRefresh,
  votes,
  onVoteReply,
  onReplyTo,
  activeReplyId = null,
  listHeader,
  listFooter,
  testID = 'reply-list',
}: ReplyListProps) {
  const depths = replyDepths(replies);

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={replies}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        hasError ? (
          <ErrorState
            message={errorMessage ?? 'Unable to load replies.'}
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <ThreadDetailSkeleton replyRows={2} testID={`${testID}-skeleton`} />
        ) : (
          <EmptyState
            icon="💬"
            message="Be the first to reply to this discussion."
            testID={`${testID}-empty`}
            title="No replies yet"
          />
        )
      }
      ListFooterComponent={listFooter ?? null}
      ListHeaderComponent={listHeader ?? null}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
      testID={testID}
      renderItem={({ item, index }) => (
        <ReplyRow
          depth={depths.get(item.id) ?? 0}
          isActiveTarget={activeReplyId === item.id}
          onReplyTo={onReplyTo}
          onVote={(direction) => onVoteReply(item.id, direction)}
          reply={item}
          testID={`${testID}-item-${index}`}
          vote={votes[item.id] ?? 'none'}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: palette.background,
  },
});

export default ReplyList;
