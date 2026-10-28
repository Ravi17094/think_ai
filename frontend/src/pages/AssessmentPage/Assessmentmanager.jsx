import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import { Plus, FileText, Award } from "lucide-react";

import { getCourses } from "../../api/courseApi";

import {
  fetchModulesByCourseId,
  selectModules,
  selectModulesLoading,
  selectModulesError,
  clearModuleError,
} from "../../features/modules/moduleSlice";

import {
  fetchAssessmentsByModuleId,
  createAssessmentThunk,
  updateAssessmentThunk,
  deleteAssessmentThunk,
  selectAssessmentsByModuleId,
  selectAssessmentsLoading,
  selectAssessmentError,
  clearAssessmentError,
} from "../../features/assessments/assessmentSlice";

import { FONT_IMPORT } from "./Constants.js";
import ModuleSidebar from "./Modulesidebar.jsx";
import AssessmentForm from "./Assessmentform.jsx";
import AssessmentList from "./Assessmentlist.jsx";
import AssessmentViewModal from "./Assessmentviewmodal.jsx";
import AssessmentAnalyticsView from "./Assessmentanalyticsview.jsx";

export default function AssessmentManager({ initialCourseId = null }) {
  const dispatch = useDispatch();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [searchQuery, setSearchQuery] = useState("");

  const modules = useSelector(selectModules);
  const modulesLoading = useSelector(selectModulesLoading);
  const modulesError = useSelector(selectModulesError);

  // Safety net: some slices keep a flat/cached module list across course
  // switches. Filter here so a module from a *different* course can never
  // render under the currently selected course, even if the store lags.
  const courseModules = useMemo(() => {
    if (!Array.isArray(modules)) return [];
    return modules.filter((m) => {
      const moduleCourseId = m.courseId ?? m.course?.id ?? m.course_id;
      // If a module has no courseId field at all, don't hide it — just
      // pass it through rather than assume it's mismatched.
      if (moduleCourseId == null) return true;
      return String(moduleCourseId) === String(selectedCourseId);
    });
  }, [modules, selectedCourseId]);

  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedAssessmentIdForAnalytics, setSelectedAssessmentIdForAnalytics] = useState(null);
  const [viewingAssessment, setViewingAssessment] = useState(null);

  const selectModuleAssessments = useMemo(
    () => selectAssessmentsByModuleId(selectedModuleId),
    [selectedModuleId]
  );
  const rawAssessments = useSelector(selectModuleAssessments);

  // Same safety net as modules: guarantee an assessment from a different
  // module can never render under the currently selected module.
  const assessments = useMemo(() => {
    if (!Array.isArray(rawAssessments)) return rawAssessments;
    return rawAssessments.filter((a) => {
      const asmModuleId = a.moduleId ?? a.module?.id ?? a.module_id;
      if (asmModuleId == null) return true;
      return String(asmModuleId) === String(selectedModuleId);
    });
  }, [rawAssessments, selectedModuleId]);

  const assessmentsLoading = useSelector(selectAssessmentsLoading);
  const assessmentsError = useSelector(selectAssessmentError);

  const [assessmentFormMode, setAssessmentFormMode] = useState(null);
  const [confirmDeleteAssessment, setConfirmDeleteAssessment] = useState(null);
  const [savingAssessmentId, setSavingAssessmentId] = useState(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setCoursesLoading(true);
        const response = await getCourses(searchQuery, 1, 50);
        const payload = response?.data?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.courses)
            ? payload.courses
            : Array.isArray(payload?.items)
              ? payload.items
              : [];

        if (isMounted) {
          setCourses(list);
          if (!selectedCourseId && list.length === 1) {
            setSelectedCourseId(list[0].id);
          }
        }
      } catch (error) {
        console.error(error);
        if (isMounted) toast.error("Failed to load courses", { theme: "dark" });
      } finally {
        if (isMounted) setCoursesLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [searchQuery]);

  useEffect(() => {
    if (modulesError) {
      toast.error(modulesError, { theme: "dark" });
      dispatch(clearModuleError());
    }
  }, [modulesError, dispatch]);

  useEffect(() => {
    if (assessmentsError) {
      toast.error(assessmentsError, { theme: "dark" });
      dispatch(clearAssessmentError());
    }
  }, [assessmentsError, dispatch]);

  useEffect(() => {
    if (selectedCourseId) dispatch(fetchModulesByCourseId(selectedCourseId));
    setSelectedModuleId(null);
    setSelectedAssessmentIdForAnalytics(null);
    setViewingAssessment(null);
  }, [selectedCourseId, dispatch]);

  useEffect(() => {
    if (Array.isArray(courseModules) && courseModules.length && selectedModuleId == null) {
      setSelectedModuleId(courseModules[0].id);
    }
  }, [courseModules, selectedModuleId]);

  useEffect(() => {
    if (selectedModuleId != null) {
      dispatch(fetchAssessmentsByModuleId(selectedModuleId));
    }
  }, [selectedModuleId, dispatch]);

  const selectedModule = Array.isArray(courseModules) ? courseModules.find((m) => m.id === selectedModuleId) || null : null;
  const selectedCourse = Array.isArray(courses) ? courses.find((c) => c.id === selectedCourseId) || null : null;

  const handleCreateAssessment = async (data) => {
    setSavingAssessmentId("new");
    try {
      await dispatch(createAssessmentThunk({ ...data, moduleId: selectedModuleId })).unwrap();
      setAssessmentFormMode(null);
      toast.success("Assessment created successfully", { theme: "dark" });
    } catch (err) {
      toast.error(err?.message || "Failed to create assessment", { theme: "dark" });
    } finally {
      setSavingAssessmentId(null);
    }
  };

  const handleSaveAssessment = async (id, data) => {
    setSavingAssessmentId(id);
    try {
      await dispatch(updateAssessmentThunk({ id, data })).unwrap();
      setAssessmentFormMode(null);
      toast.success("Assessment updated successfully", { theme: "dark" });
    } catch (err) {
      toast.error(err?.message || "Failed to update assessment", { theme: "dark" });
    } finally {
      setSavingAssessmentId(null);
    }
  };

  const handleDeleteAssessment = async (id) => {
    setDeletingAssessmentId(id);
    try {
      await dispatch(deleteAssessmentThunk(id)).unwrap();
      setConfirmDeleteAssessment(null);
      toast.success("Assessment deleted successfully", { theme: "dark" });
    } catch (err) {
      toast.error(err?.message || "Failed to delete assessment", { theme: "dark" });
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  return (
    <div
      className="min-h-full w-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE6] to-[#E5E2D9] dark:from-[#0b0f17] dark:via-[#111827] dark:to-[#0f172a] text-slate-900 dark:text-[#f1f3f9] transition-colors duration-500 font-sans"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      {viewingAssessment && (
        <AssessmentViewModal assessment={viewingAssessment} onClose={() => setViewingAssessment(null)} />
      )}

      <div className="px-8 pt-8 pb-6 border-b border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md bg-white/40 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
              Assessment Management Hub
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-1" style={{ fontFamily: "Fraunces, serif" }}>
              {selectedCourse ? selectedCourse.title : "Select a Course"}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <select
              value={selectedCourseId ?? ""}
              onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
              disabled={coursesLoading}
              className="w-full sm:w-56 px-4 py-2 rounded-2xl text-xs font-semibold bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer backdrop-blur-md text-slate-900 dark:text-white shadow-sm transition-all"
            >
              <option value="" disabled className="bg-white dark:bg-slate-900">
                {coursesLoading ? "Loading courses…" : "Choose a course…"}
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedCourseId ? (
        <div className="max-w-4xl mx-auto my-16 p-12 rounded-3xl backdrop-blur-2xl bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 shadow-2xl text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
            <Award size={28} />
          </div>
          <h3 className="text-xl font-bold">No Course Selected</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Choose a course from the selector above to manage module assessments, questions, options, and student analytics.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <ModuleSidebar
              modules={courseModules}
              selectedModuleId={selectedModuleId}
              onSelectModule={(id) => {
                setSelectedModuleId(id);
                setSelectedAssessmentIdForAnalytics(null);
                setViewingAssessment(null);
              }}
            />

            <div className="lg:col-span-8">
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl min-h-[500px]">
                {!selectedModuleId ? (
                  <div className="h-64 flex flex-col items-center justify-center rounded-2xl text-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                    <FileText size={24} />
                    <span className="text-xs">Select a module from the left panel to manage assessments</span>
                  </div>
                ) : selectedAssessmentIdForAnalytics ? (
                  <AssessmentAnalyticsView
                    assessmentId={selectedAssessmentIdForAnalytics}
                    courseId={selectedCourseId}
                    onBack={() => setSelectedAssessmentIdForAnalytics(null)}
                  />
                ) : (
                  <>
                    <div className="mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/60 flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "Fraunces, serif" }}>
                          {selectedModule?.title} — Assessments
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Manage MCQ & Coding assessments, test cases, and review student performance marks.
                        </p>
                      </div>
                      <button
                        onClick={() => setAssessmentFormMode("new")}
                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-green-500 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Add Assessment
                      </button>
                    </div>

                    {assessmentFormMode === "new" && (
                      <div className="mb-6">
                        <AssessmentForm
                          saving={savingAssessmentId === "new"}
                          onCancel={() => setAssessmentFormMode(null)}
                          onSave={handleCreateAssessment}
                        />
                      </div>
                    )}

                    {assessmentsLoading && Array.isArray(assessments) && assessments.length === 0 && (
                      <div className="text-xs py-8 text-center text-slate-400">Loading module assessments…</div>
                    )}

                    <AssessmentList
                      assessments={assessments}
                      assessmentFormMode={assessmentFormMode}
                      setAssessmentFormMode={setAssessmentFormMode}
                      confirmDeleteAssessment={confirmDeleteAssessment}
                      setConfirmDeleteAssessment={setConfirmDeleteAssessment}
                      deletingAssessmentId={deletingAssessmentId}
                      savingAssessmentId={savingAssessmentId}
                      onSaveAssessment={handleSaveAssessment}
                      onDeleteAssessment={handleDeleteAssessment}
                      onView={setViewingAssessment}
                      onAnalytics={setSelectedAssessmentIdForAnalytics}
                    />
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
