import { useState } from "react";
import { parseTagsInput, validateDiscussionInput } from "../../utils/validation";
import RichTextEditor from "../moderation/RichTextEditor";

/**
 * Create discussion form with title/body validation (Phase 1).
 * `categories` is the Phase 5 category list.
 */
export default function CreateDiscussionForm({
  categories = [],
  onSubmit,
  onCancel,
  serverErrors,
  submitting: submittingProp = false,
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submittingInternal, setSubmittingInternal] = useState(false);
  const submitting = submittingProp || submittingInternal;
  const fieldErrors = serverErrors ? { ...serverErrors, ...errors } : errors;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError(null);

    const { valid, errors: validationErrors, trimmedTitle, trimmedBody } =
      validateDiscussionInput({ title, body });
    if (!valid) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmittingInternal(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        body: trimmedBody,
        tags: parseTagsInput(tagsInput),
        categoryId: categoryId || undefined,
      });
    } catch (err) {
      setServerError(err.message || "Could not create discussion");
      if (err.errors) setErrors(err.errors);
    } finally {
      setSubmittingInternal(false);
    }
  };

  return (
    <form className="create-form" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="form-banner form-banner--error" role="alert">
          {serverError}
        </div>
      )}

      <div className="field">
        <label htmlFor="discussion-title">Title</label>
        <input
          id="discussion-title"
          type="text"
          value={title}
          placeholder="Summarise your question or topic"
          onChange={(event) => setTitle(event.target.value)}
          disabled={submitting}
        />
        {fieldErrors.title && (
          <p className="field-error" role="alert">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="discussion-body">Body</label>
        <RichTextEditor
          id="discussion-body"
          value={body}
          placeholder="Describe your question in detail. Mention people with @username."
          onChange={setBody}
        />
        {fieldErrors.body && (
          <p className="field-error" role="alert">
            {fieldErrors.body}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="discussion-category">Category</label>
        <select
          id="discussion-category"
          className="select"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={submitting}
          style={{ width: "100%" }}
        >
          <option value="">General</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="discussion-tags">Tags (comma separated, max 6)</label>
        <input
          id="discussion-tags"
          type="text"
          value={tagsInput}
          placeholder="react, api, testing"
          onChange={(event) => setTagsInput(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Publishing…" : "Publish discussion"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
