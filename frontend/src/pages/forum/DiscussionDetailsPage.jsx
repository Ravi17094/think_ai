import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../../styles/forum.css";

import DiscussionDetails from "../../components/forum/DiscussionDetails";
import CommentList from "../../components/forum/CommentList";
import CommentForm from "../../components/forum/CommentForm";
import NotificationToast from "../../components/forum/NotificationToast";
import { fetchDiscussionById, flagDiscussion, setDiscussionSolved, fetchComments, postComment } from "../../services/forumApi";
import { useVoting } from "../../hooks/useVoting";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useForumSocket } from "../../hooks/useForumSocket";

/** Thread detail page: discussion body + comments (Phase 1/2). */
export default function DiscussionDetailsPage() {
  const { id } = useParams();
  const [discussion, setDiscussion] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const pushToast = (notification) => {
    setToasts((previous) => [...previous.slice(-2), notification]);
  };

  // Real-time: surface incoming notifications (mentions / replies / moderation
  // alerts for the current user) as toasts without any page refresh.
  const { subscribe } = useForumSocket();
  useEffect(() => {
    const unsubscribe = subscribe("notification:new", (notification) => {
      pushToast({
        id: `socket-${notification.id || Date.now()}`,
        type: notification.type,
        message: notification.message,
        link: notification.link,
      });
    });
    return unsubscribe;
  }, [subscribe]);

  const { vote, pendingIds } = useVoting((message) =>
    pushToast({ id: `vote-err-${Date.now()}`, type: "system", message })
  );
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchDiscussionById(id), fetchComments(id)])
      .then(([discussionData, commentData]) => {
        if (cancelled) return;
        setDiscussion(discussionData);
        setComments(commentData);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load discussion", err);
          setError("Failed to load discussion");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const patchDiscussion = (patch) =>
    setDiscussion((previous) => ({ ...previous, ...patch }));

  const handleVote = (direction) => vote(discussion.id, direction, patchDiscussion);

  const handleToggleSolved = async () => {
    try {
      const updated = await setDiscussionSolved(discussion.id, !discussion.solved);
      patchDiscussion(updated);
    } catch (err) {
      pushToast({ id: `solved-err-${Date.now()}`, message: err.message || "Could not update solved state" });
    }
  };

  const handleFlag = async () => {
    try {
      await flagDiscussion(discussion.id, "Reported from thread view");
      pushToast({
        id: `flag-${Date.now()}`,
        type: "moderation",
        message: "Thanks — this thread was reported to the moderators.",
      });
    } catch (err) {
      pushToast({ id: `flag-err-${Date.now()}`, message: err.message || "Could not flag thread" });
    }
  };

  const handleCommentSubmit = async (body) => {
    const created = await postComment(discussion.id, body);
    setComments((previous) => [...previous, created]);
    patchDiscussion({ replyCount: (discussion.replyCount || 0) + 1 });
    if (created.notificationsCreated > 0) {
      pushToast({
        id: `mention-${created.comment?.id || Date.now()}`,
        message: `${created.notificationsCreated} user(s) were notified about your mention.`,
      });
    }
  };

  if (loading) {
    return (
      <div className="forum-page">
        <div className="forum-container">
          <p className="loading-note">Loading discussion…</p>
        </div>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="forum-page">
        <div className="forum-container">
          <div className="error-banner" role="alert">
            {error || "Discussion not found."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-page">
      <div className="forum-container">
        <DiscussionDetails
          discussion={discussion}
          onVote={handleVote}
          votePending={pendingIds.has(discussion.id)}
          isBookmarked={isBookmarked(discussion.id)}
          onToggleBookmark={() => toggleBookmark(discussion.id)}
          canManageSolved
          onToggleSolved={handleToggleSolved}
          onFlag={handleFlag}
          commentsSection={
            <>
              <h2 className="section-heading">💬 Comments ({comments.length})</h2>
              <CommentList comments={comments} />
              <CommentForm onSubmit={handleCommentSubmit} />
            </>
          }
        />
      </div>

      <NotificationToast
        notifications={toasts}
        onDismiss={(toastId) => setToasts((previous) => previous.filter((t) => t.id !== toastId))}
      />
    </div>
  );
}
