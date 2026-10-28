import DiscussionCard from "./DiscussionCard";
import EmptyState from "./EmptyState";

/** Renders the discussion cards or an empty state (Phase 1/4). */
export default function DiscussionList({
  discussions,
  emptyTitle,
  emptyMessage,
  onVote,
  isBookmarked,
  onToggleBookmark,
  pendingVoteIds,
  emptyActionLabel,
  onEmptyAction,
  searchTerm,
}) {
  if (!discussions || discussions.length === 0) {
    return (
      <EmptyState
        title={emptyTitle || "No discussions yet"}
        message={
          emptyMessage ||
          "Be the first to start a conversation with the community."
        }
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="discussion-list">
      {discussions.map((discussion) => (
        <DiscussionCard
          key={discussion.id}
          discussion={discussion}
          onVote={onVote}
          isBookmarked={isBookmarked ? isBookmarked(discussion.id) : undefined}
          onToggleBookmark={onToggleBookmark}
          votePending={pendingVoteIds ? pendingVoteIds.has(discussion.id) : false}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}
