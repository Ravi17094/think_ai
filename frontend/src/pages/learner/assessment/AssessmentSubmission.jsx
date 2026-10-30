import React, { useState, useEffect, useRef, useCallback } from "react";

const QUESTION_STATUS = {
  UNVISITED: "unvisited",
  VISITED: "visited",
  ANSWERED: "answered",
  FLAGGED: "flagged",
};

const MOCK_QUESTIONS = [
  {
    id: "q1",
    prompt: "Which hook is used to manage side effects in a React function component?",
    options: ["useState", "useEffect", "useRef", "useMemo"],
  },
  {
    id: "q2",
    prompt: "What does JSX compile down to at build time?",
    options: [
      "Raw HTML strings",
      "React.createElement calls",
      "Web Components",
      "JSON templates",
    ],
  },
  {
    id: "q3",
    prompt: "Which HTTP status code indicates a successful resource creation?",
    options: ["200", "201", "204", "301"],
  },
  {
    id: "q4",
    prompt: "In CSS, which property controls the stacking order of elements?",
    options: ["z-order", "layer", "z-index", "stack-index"],
  },
  {
    id: "q5",
    prompt: "What is the primary purpose of a debounce function?",
    options: [
      "Cache API responses",
      "Delay execution until input settles",
      "Compress network payloads",
      "Retry failed requests",
    ],
  },
];

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function AssessmentSubmission({
  questions = MOCK_QUESTIONS,
  durationSeconds = 15 * 60,
  onAutosave = (answers) => console.log("[autosave]", answers),
  onSubmit = (answers) => console.log("[submit]", answers),
  autosaveDelayMs = 1200,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [visited, setVisited] = useState({ 0: true });
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const autosaveTimer = useRef(null);
  const currentQuestion = questions[currentIndex];

  // ---- Timer ----
  useEffect(() => {
    if (submitted) return;
    if (secondsLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, submitted]);

  const isLowTime = secondsLeft <= 60;

  // ---- Autosave (debounced) ----
  const scheduleAutosave = useCallback(
    (nextAnswers) => {
      setSaveState("saving");
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(async () => {
        try {
          await Promise.resolve(onAutosave(nextAnswers));
          setSaveState("saved");
        } catch (e) {
          setSaveState("error");
        }
      }, autosaveDelayMs);
    },
    [onAutosave, autosaveDelayMs]
  );

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  // ---- Answer handling ----
  const selectAnswer = (questionId, optionIndex) => {
    const next = { ...answers, [questionId]: optionIndex };
    setAnswers(next);
    scheduleAutosave(next);
  };

  const toggleFlag = (questionId) => {
    setFlagged((f) => ({ ...f, [questionId]: !f[questionId] }));
  };

  const goTo = (index) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    setVisited((v) => ({ ...v, [index]: true }));
  };

  const statusFor = (index) => {
    const q = questions[index];
    if (flagged[q.id]) return QUESTION_STATUS.FLAGGED;
    if (answers[q.id] !== undefined) return QUESTION_STATUS.ANSWERED;
    if (visited[index]) return QUESTION_STATUS.VISITED;
    return QUESTION_STATUS.UNVISITED;
  };

  const answeredCount = Object.keys(answers).length;

  // ---- Submit ----
  const handleSubmit = (auto = false) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSubmitted(true);
    setShowSubmitModal(false);
    onSubmit(answers);
    if (auto) {
      // time-expired path — no extra UI needed beyond the submitted state
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[480px] w-full flex items-center justify-center bg-[#FAFAF8] rounded-2xl border border-neutral-200 p-8">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Assessment submitted</h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            You answered {answeredCount} of {questions.length} questions. Your results will be available on your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#FAFAF8] rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header — stack on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-200 bg-white">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-neutral-900 truncate">Frontend Fundamentals — Quiz 3</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <SaveIndicator state={saveState} />
          <div
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium tabular-nums border ${
              isLowTime
                ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                : "bg-neutral-50 border-neutral-200 text-neutral-700"
            }`}
            role="timer"
            aria-live="polite"
          >
            <ClockIcon />
            {formatTime(secondsLeft)}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Question panel */}
        <div className="flex-1 p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] leading-relaxed text-neutral-900 font-medium">
              {currentQuestion.prompt}
            </p>
            <button
              onClick={() => toggleFlag(currentQuestion.id)}
              className={`shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border transition-colors ${
                flagged[currentQuestion.id]
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300"
              }`}
            >
              <FlagIcon filled={!!flagged[currentQuestion.id]} />
              {flagged[currentQuestion.id] ? "Flagged" : "Flag"}
            </button>
          </div>

          <div className="mt-5 space-y-2.5">
            {currentQuestion.options.map((opt, i) => {
              const selected = answers[currentQuestion.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => selectAnswer(currentQuestion.id, i)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                    selected
                      ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className={`shrink-0 h-4 w-4 rounded-full border flex items-center justify-center ${
                      selected ? "border-indigo-500" : "border-neutral-300"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Prev / Next */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              Previous
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Review &amp; submit
              </button>
            ) : (
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {/* Question navigator */}
        <div className="md:w-64 border-t md:border-t-0 md:border-l border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Questions
            </h3>
            <span className="text-xs text-neutral-400">
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => goTo(i)}
                className={navButtonClasses(statusFor(i), i === currentIndex)}
                aria-current={i === currentIndex}
                aria-label={`Question ${i + 1}, ${statusFor(i)}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-1.5 text-xs text-neutral-500">
            <LegendRow swatch="bg-emerald-500" label="Answered" />
            <LegendRow swatch="bg-amber-500" label="Flagged" />
            <LegendRow swatch="bg-neutral-300" label="Visited" />
            <LegendRow swatch="bg-neutral-100 border border-neutral-300" label="Unvisited" />
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="mt-5 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Submit assessment
          </button>
        </div>
      </div>

      {showSubmitModal && (
        <SubmitModal
          answeredCount={answeredCount}
          total={questions.length}
          flaggedCount={Object.values(flagged).filter(Boolean).length}
          onCancel={() => setShowSubmitModal(false)}
          onConfirm={() => handleSubmit(false)}
        />
      )}
    </div>
  );
}

function navButtonClasses(status, isCurrent) {
  const base =
    "h-9 w-9 rounded-lg text-xs font-medium flex items-center justify-center border transition-colors";
  const ring = isCurrent ? "ring-2 ring-offset-1 ring-neutral-900" : "";
  switch (status) {
    case QUESTION_STATUS.ANSWERED:
      return `${base} ${ring} bg-emerald-500 border-emerald-500 text-white`;
    case QUESTION_STATUS.FLAGGED:
      return `${base} ${ring} bg-amber-500 border-amber-500 text-white`;
    case QUESTION_STATUS.VISITED:
      return `${base} ${ring} bg-neutral-300 border-neutral-300 text-neutral-700`;
    default:
      return `${base} ${ring} bg-neutral-100 border-neutral-300 text-neutral-500`;
  }
}

function LegendRow({ swatch, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-sm ${swatch}`} />
      {label}
    </div>
  );
}

function SaveIndicator({ state }) {
  const map = {
    idle: { text: "Not saved yet", color: "text-neutral-400", dot: "bg-neutral-300" },
    saving: { text: "Saving…", color: "text-neutral-500", dot: "bg-amber-400 animate-pulse" },
    saved: { text: "Saved", color: "text-emerald-600", dot: "bg-emerald-500" },
    error: { text: "Save failed — retrying", color: "text-red-600", dot: "bg-red-500" },
  };
  const s = map[state] || map.idle;
  return (
    <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${s.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.text}
    </div>
  );
}

function SubmitModal({ answeredCount, total, flaggedCount, onCancel, onConfirm }) {
  const unanswered = total - answeredCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-neutral-200 p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-neutral-900">Submit assessment?</h3>
        <p className="mt-1.5 text-sm text-neutral-500">
          You've answered {answeredCount} of {total} questions.
          {unanswered > 0 && ` ${unanswered} will be marked unanswered.`}
          {flaggedCount > 0 && ` ${flaggedCount} question${flaggedCount > 1 ? "s are" : " is"} flagged for review.`}
        </p>
        <p className="mt-2 text-xs text-neutral-400">This action can't be undone.</p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Keep working
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlagIcon({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path d="M5 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M5 4h11l-2.5 4L16 12H5V4z"
        stroke="currentColor"
        strokeWidth={filled ? "0" : "2"}
        strokeLinejoin="round"
      />
    </svg>
  );
}