import { useEffect, useState } from "react";

const CHECKLIST_ITEMS = [
  "Test microphone",
  "Upload slide deck",
  "Configure breakout rooms",
  "Set poll questions",
  "Verify recording enabled",
];

export default function SessionPrepChecklist({ onOpenLiveStudio }) {
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("instructor-session-prep") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("instructor-session-prep", JSON.stringify(completed));
  }, [completed]);

  const toggleItem = (item) => {
    setCompleted((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]
    );
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#262b38] dark:bg-[#1a1e2b]">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Session preparation checklist</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-[#94a3b8]">
        Complete these checks before starting a live class.
      </p>
      <ul className="mt-4 space-y-3">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item}>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={completed.includes(item)}
                onChange={() => toggleItem(item)}
                className="h-4 w-4 accent-purple-600"
              />
              <span className={completed.includes(item) ? "line-through opacity-60" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500 dark:text-[#94a3b8]">
        {completed.length} of {CHECKLIST_ITEMS.length} checks complete
      </p>
      <p className="mt-3 text-xs text-slate-500 dark:text-[#94a3b8]">
        This checklist is saved on this browser. Create and launch live polls from Live Studio.
      </p>
      <button type="button" onClick={onOpenLiveStudio} className="mt-4 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-500/10">
        Open Live Studio for polls
      </button>
    </section>
  );
}
