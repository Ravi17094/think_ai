import { useEffect, useRef, useState } from "react";

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Studio chat with message history, timestamps, avatars and a message input
 * (Phase 6/7). Messages arrive through the socket; `messages` is owned by
 * the page.
 */
export default function ChatPanel({
  messages = [],
  onSend,
  onDeleteMessage,
  canModerate = false,
  onClose,
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="studio-panel studio-drawer chat-panel" data-testid="chat-panel">
      <div className="studio-drawer__header">
        <h2>Chat</h2>
        {onClose && (
          <button
            type="button"
            className="studio-close-btn"
            onClick={onClose}
            aria-label="Close chat"
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
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="loading-note">No messages yet — say hello!</p>
        )}
        {messages.map((message) => {
          const isDeleted = Boolean(message.deleted);
          return (
            <div
              key={message.id}
              className={`chat-message ${isDeleted ? "chat-message--deleted" : ""}`}
              data-message-id={message.id}
            >
              <div className="chat-message__meta">
                <span className="chat-message__author">{message.userName}</span>
                <span className="chat-message__time">{formatTime(message.timestamp)}</span>
                {canModerate && !isDeleted && onDeleteMessage && (
                  <button
                    type="button"
                    className="chat-delete-btn"
                    onClick={() => onDeleteMessage(message.id)}
                    aria-label={`Delete message from ${message.userName}`}
                  >
                    delete
                  </button>
                )}
              </div>
              <span>{message.text}</span>
            </div>
          );
        })}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          placeholder="Type a message…"
          aria-label="Chat message"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="btn btn--primary btn--small" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
