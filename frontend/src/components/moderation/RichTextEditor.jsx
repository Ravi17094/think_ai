import { useCallback, useRef, useState } from "react";
import { forumGet } from "../../services/forumApi";

const TOOLBAR_ACTIONS = [
  { label: "B", title: "Bold", before: "**", after: "**" },
  { label: "I", title: "Italic", before: "_", after: "_" },
  { label: "•", title: "Bullet list", before: "- ", after: "" },
  { label: "🔗", title: "Link", before: "[", after: "](https://)" },
  { label: "</>", title: "Code", before: "`", after: "`" },
  { label: "🖼", title: "Image", before: "![alt](", after: ")" },
];

/**
 * Lightweight rich text editor with formatting toolbar, preview, and
 * @mention autocomplete (Phase 8). Stores plain text/markdown — no
 * external editor dependency.
 */
export default function RichTextEditor({ value, onChange, placeholder, id }) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionOptions, setMentionOptions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  const wrapSelection = (before, after) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const next =
      value.slice(0, start) + before + (selected || "") + after + value.slice(end);
    if (onChange) onChange(next);
  };

  const handleInput = useCallback((event) => {
    const newValue = event.target.value;
    if (onChange) onChange(newValue);

    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart;
    const textBefore = newValue.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w{0,20})$/);

    if (atMatch) {
      const query = atMatch[1];
      setMentionQuery(query);
      setMentionIndex(0);

      forumGet("/moderation/users/search", { q: query }).then((payload) => {
        const users = (payload.data || []).filter(
          (u) =>
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.name.toLowerCase().includes(query.toLowerCase())
        );
        setMentionOptions(users.slice(0, 5));
      }).catch(() => setMentionOptions([]));
    } else {
      setMentionQuery(null);
      setMentionOptions([]);
    }
  }, [onChange]);

  const insertMention = useCallback((username) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    const atIndex = textBefore.lastIndexOf("@");
    if (atIndex === -1) return;

    const newText = textBefore.slice(0, atIndex) + "@" + username + " " + textAfter;
    if (onChange) onChange(newText);
    setMentionQuery(null);
    setMentionOptions([]);

    setTimeout(() => {
      const newCursorPos = atIndex + username.length + 2;
      el.setSelectionRange(newCursorPos, newCursorPos);
      el.focus();
    }, 0);
  }, [value, onChange]);

  const handleKeyDown = useCallback((event) => {
    if (!mentionQuery || mentionOptions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionIndex((prev) => (prev + 1) % mentionOptions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionIndex((prev) => (prev - 1 + mentionOptions.length) % mentionOptions.length);
    } else if (event.key === "Enter" && mentionQuery !== null) {
      event.preventDefault();
      insertMention(mentionOptions[mentionIndex]?.username || mentionOptions[0]?.username);
    } else if (event.key === "Escape") {
      setMentionQuery(null);
      setMentionOptions([]);
    }
  }, [mentionQuery, mentionOptions, mentionIndex, insertMention]);

  return (
    <div className="rich-editor" data-testid="rich-text-editor">
      <div className="rich-editor__toolbar" role="toolbar" aria-label="Formatting">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.title}
            type="button"
            title={action.title}
            aria-label={action.title}
            className="btn btn--small btn--ghost"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => wrapSelection(action.before, action.after)}
          >
            {action.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn--small"
          onClick={() => setShowPreview((previous) => !previous)}
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {showPreview ? (
        <div
          className="rich-editor__preview comment__body"
          data-testid="rich-preview"
          dangerouslySetInnerHTML={{
            __html: value.trim() ? renderSimpleMarkdown(value) : "<em>Nothing to preview yet.</em>",
          }}
        />
      ) : (
        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            id={id}
            className="rich-editor__textarea"
            rows={5}
            value={value}
            placeholder={placeholder}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          {mentionQuery !== null && mentionOptions.length > 0 && (
            <ul
              className="mention-autocomplete"
              data-testid="mention-autocomplete"
              style={{
                position: "absolute",
                bottom: 4,
                left: 8,
                background: "var(--forum-surface-2, #1c2440)",
                border: "1px solid var(--forum-border, #2a3555)",
                borderRadius: 8,
                padding: "4px 0",
                margin: 0,
                listStyle: "none",
                minWidth: 180,
                zIndex: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {mentionOptions.map((user, index) => (
                <li
                  key={user.id}
                  className={index === mentionIndex ? "mention-option--active" : ""}
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: "0.83rem",
                    color: index === mentionIndex ? "var(--forum-accent)" : "var(--forum-text)",
                    background: index === mentionIndex ? "var(--forum-accent-soft)" : "transparent",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(user.username);
                  }}
                >
                  {user.name} <span style={{ color: "var(--forum-text-dim)" }}>@{user.username}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal markdown-ish rendering for the preview pane. Input is HTML-escaped
 * first so only the tags generated below (strong/em/li/br/code/img) can appear.
 */
function renderSimpleMarkdown(text) {
  const htmlEscaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withBold = htmlEscaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const withItalics = withBold.replace(/_([^_]+)_/g, "<em>$1</em>");
  const withCode = withItalics.replace(/`([^`]+)`/g, "<code>$1</code>");
  const withImages = withCode.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px" />'
  );
  const withLinks = withImages.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return withLinks
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) return `<ul><li>${trimmed.slice(2)}</li></ul>`;
      return `${line}<br />`;
    })
    .join("");
}
