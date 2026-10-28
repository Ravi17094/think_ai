import { useState } from "react";

/**
 * Poll panel: live results, voting and poll creation (Phase 6/7).
 * Polls are owned by the page; updates arrive via socket / REST.
 */
export default function PollPanel({
  polls = [],
  onVote,
  onCreatePoll,
  canCreatePoll = false,
  onClose,
}) {
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [error, setError] = useState(null);

  const handleCreate = (event) => {
    event.preventDefault();
    const options = optionsText
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    if (question.trim().length < 5) {
      setError("Question must be at least 5 characters");
      return;
    }
    if (options.length < 2) {
      setError("Provide at least 2 comma-separated options");
      return;
    }
    setError(null);
    onCreatePoll({ question: question.trim(), options });
    setQuestion("");
    setOptionsText("");
  };

  return (
    <div className="studio-panel studio-drawer" data-testid="poll-panel">
      <div className="studio-drawer__header">
        <h2>Polls</h2>
        {onClose && (
          <button
            type="button"
            className="studio-close-btn"
            onClick={onClose}
            aria-label="Close polls"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {polls.length === 0 && <p className="loading-note">No polls yet.</p>}

      {polls.map((poll) => (
        <div key={poll.id} className="poll-card" data-poll-id={poll.id}>
          <p className="poll-question">{poll.question}</p>
          {(() => {
            const totalVotes =
              poll.totalVotes != null
                ? poll.totalVotes
                : (poll.options || []).reduce((sum, option) => sum + (option.votes || 0), 0);
            return poll.options.map((option) => {
              const percent =
                option.percent != null
                  ? option.percent
                  : totalVotes > 0
                    ? Math.round((option.votes / totalVotes) * 100)
                    : 0;
              return (
                <div key={option.id} className="poll-option">
                  <button type="button" onClick={() => onVote && onVote(poll.id, option.id)}>
                    {option.text}
                  </button>
                  <div className="poll-bar-track" aria-hidden="true">
                    <div className="poll-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="poll-percent">
                    {percent}% ({option.votes})
                  </span>
                </div>
              );
            });
          })()}
          {typeof poll.totalVotes === "number" && (
            <p className="loading-note" style={{ padding: 0, textAlign: "left", fontSize: "0.72rem" }}>
              {poll.totalVotes} votes · status: {poll.status || "open"}
            </p>
          )}
        </div>
      ))}

      {canCreatePoll && (
        <form className="poll-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={question}
            placeholder="Poll question"
            aria-label="Poll question"
            onChange={(event) => setQuestion(event.target.value)}
          />
          <input
            type="text"
            value={optionsText}
            placeholder="Options, comma separated (min 2)"
            aria-label="Poll options"
            onChange={(event) => setOptionsText(event.target.value)}
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--small">
            Create poll
          </button>
        </form>
      )}
    </div>
  );
}
