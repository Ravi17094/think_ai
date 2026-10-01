import { useState } from "react";

const CHECKLIST_ITEMS = [
  "Test microphone",
  "Upload slide deck",
  "Configure breakout rooms",
  "Set poll questions",
  "Verify recording enabled",
];

export default function SessionPrepChecklist() {
  const [completed, setCompleted] = useState([]);

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
    </section>
  );
}
