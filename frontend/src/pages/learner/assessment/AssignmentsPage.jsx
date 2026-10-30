import React, { useEffect, useState } from 'react';
// import { fetchAssignments } from '../../../api/assessmentApi'; // TODO: doesn't exist yet — backend needs GET /api/assessments/mine or similar

const STATUS_STYLES = {
  pending: 'bg-[var(--accent-to)]/15 text-[var(--accent-to)]',
  submitted: 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
  graded: 'bg-[var(--success)]/15 text-[var(--success)]',
  overdue: 'bg-[var(--danger)]/15 text-[var(--danger)]',
};

function formatDueDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // TEMPORARY STUB — replace once backend exposes a list endpoint.
    // Expected shape per item: { id, title, courseTitle, status, dueDate, score }
    Promise.resolve([])
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!assignments) {
    return <div className="p-6 text-sm text-neutral-400">Loading assignments…</div>;
  }
  if (assignments.length === 0) {
    return <div className="p-6 text-sm text-neutral-400">No assignments yet.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Assignments</h1>
      {assignments.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{a.courseTitle}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[a.status]}`}
            >
              {a.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Due {formatDueDate(a.dueDate)}
            {a.status === 'graded' && a.score != null && ` · Score: ${a.score}%`}
          </p>
        </div>
      ))}
    </div>
  );
}