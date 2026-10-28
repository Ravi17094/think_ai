import React from "react";
import AssessmentForm from "./Assessmentform.jsx";
import ConfirmDelete from "./Confirmdelete.jsx";
import AssessmentListItem from "./Assessmentlistitem.jsx";

export default function AssessmentList({
  assessments,
  assessmentFormMode,
  setAssessmentFormMode,
  confirmDeleteAssessment,
  setConfirmDeleteAssessment,
  deletingAssessmentId,
  savingAssessmentId,
  onSaveAssessment,
  onDeleteAssessment,
  onView,
  onAnalytics,
}) {
  if (!Array.isArray(assessments) || assessments.length === 0) {
    if (assessmentFormMode === "new") return null;
    return (
      <div className="p-8 flex flex-col items-center justify-center rounded-2xl text-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
        <span className="text-xs">No assessments created for this module yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((asm, idx) => (
        <div key={asm.id}>
          {assessmentFormMode === asm.id ? (
            <AssessmentForm
              initial={asm}
              saving={savingAssessmentId === asm.id}
              onCancel={() => setAssessmentFormMode(null)}
              onSave={(data) => onSaveAssessment(asm.id, data)}
            />
          ) : confirmDeleteAssessment === asm.id ? (
            <ConfirmDelete
              label={asm.title}
              busy={deletingAssessmentId === asm.id}
              onCancel={() => setConfirmDeleteAssessment(null)}
              onConfirm={() => onDeleteAssessment(asm.id)}
            />
          ) : (
            <AssessmentListItem
              asm={asm}
              index={idx}
              onView={() => onView(asm)}
              onAnalytics={() => onAnalytics(asm.id)}
              onEdit={() => setAssessmentFormMode(asm.id)}
              onDeleteRequest={() => setConfirmDeleteAssessment(asm.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}