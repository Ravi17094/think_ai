import { Link } from "react-router-dom";
import VoteButtons from "./VoteButtons";
import BookmarkButton from "./BookmarkButton";

function initials(name) {
  return String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relativeTime(isoDate) {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text, searchTerm) {
  if (!searchTerm || !text) return text;
  const escaped = escapeRegex(searchTerm);
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="search-highlight">{part}</mark>
    ) : (
      part
    )
  );
}

/** Single discussion row used by the list and bookmark pages. */
export default function DiscussionCard({
  discussion,
  userVote,
  score,
  onVote,
  isBookmarked,
  onToggleBookmark,
  votePending = false,
  searchTerm,
}) {
  const d = discussion;
  return (
    <article className="discussion-card" data-discussion-id={d.id} data-testid="discussion-card">
      <div className="discussion-card__votes">
        <VoteButtons
          orientation="column"
          score={score != null ? score : d.score}
          userVote={userVote != null ? userVote : d.userVote}
          onVote={(direction) => onVote && onVote(d, direction)}
          disabled={votePending}
        />
      </div>

      <div className="discussion-card__main">
        <div className="discussion-card__meta-row">
          {d.solved && (
            <span className="badge badge--solved" title="This thread has a solution">
              ✓ Solved
            </span>
          )}
          {d.categoryName && (
            <span className="category-chip" style={{ borderColor: d.categoryColor || undefined }}>
              {d.categoryName}
            </span>
          )}
          <span>
            <span
              className="avatar"
              style={{ background: d.authorColor || "var(--forum-accent-solid)" }}
              aria-hidden="true"
            >
              {initials(d.author?.name)}
            </span>{" "}
            {d.author?.name}
          </span>
          <span>· {relativeTime(d.createdAt)}</span>
        </div>

        <h2 className="discussion-card__title">
          <Link to={`/forum/${d.id}`}>{highlightText(d.title, searchTerm)}</Link>
        </h2>

        <p className="discussion-card__excerpt">{highlightText(String(d.body || "").slice(0, 180), searchTerm)}</p>

        <div className="card-footer">
          <span>💬 {d.replyCount ?? 0} replies</span>
          <span>👁 {d.views ?? 0}</span>
          {(d.tags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="tag-chip">
              #{tag}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={() => onToggleBookmark && onToggleBookmark(d.id)}
          />
        </div>
      </div>
    </article>
  );
}
