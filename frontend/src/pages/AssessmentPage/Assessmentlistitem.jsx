import React from "react";
import { Eye, BarChart2, Pencil, Trash2, Clock } from "lucide-react";
import IconBtn from "./Iconbtn.jsx";

export default function AssessmentListItem({ asm, index, onView, onAnalytics, onEdit, onDeleteRequest }) {
  return (
    <div className="p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:bg-white/70 dark:hover:bg-slate-800/70">
      <div className="flex items-start gap-3.5">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
          #{index + 1}
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{asm.title}</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {asm.type || "MCQ"}
            </span>
          </div>
          {asm.description && <p className="text-xs text-slate-500">{asm.description}</p>}
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
            <span>Total Marks: {asm.totalMarks}</span>
            <span>•</span>
            <span>{asm.questions?.length || 0} Questions</span>
            {asm.duration && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {asm.duration} mins
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          onClick={onView}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1 cursor-pointer"
        >
          <Eye size={13} /> View Questions
        </button>

        <button
          onClick={onAnalytics}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition flex items-center gap-1 cursor-pointer"
        >
          <BarChart2 size={13} /> Submissions Analytics
        </button>
        <IconBtn title="Edit Assessment" onClick={onEdit}>
          <Pencil size={14} />
        </IconBtn>
        <IconBtn title="Delete Assessment" tone="danger" onClick={onDeleteRequest}>
          <Trash2 size={14} />
        </IconBtn>
      </div>
    </div>
  );
}