import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  Search,
  BarChart2,
  Video,
  Eye,
  X,
} from "lucide-react";

import { getCourses } from "../../api/courseApi";
import { getEnrollments } from "../../api/enrollmentApi";

import {
  fetchModulesByCourseId,
  createModuleThunk,
  updateModuleThunk,
  deleteModuleThunk,
  clearModuleError,
  selectModules,
  selectModulesLoading,
  selectModulesError,
} from "../../features/modules/moduleSlice";

import {
  fetchLessonsByModuleId,
  createLessonThunk,
  updateLessonThunk,
  deleteLessonThunk,
  clearLessonError,
  selectLessonsByModuleId,
  selectLessonsLoading,
  selectLessonsError,
} from "../../features/lessons/lessonSlice";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`;

function IconBtn({ onClick, title, tone = "default", disabled, children }) {
  const toneClasses =
    tone === "danger"
      ? "text-red-500 hover:bg-red-500/10"
      : tone === "accent"
        ? "text-purple-700 dark:text-purple-400 hover:bg-purple-500/10"
        : "text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5";
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer ${toneClasses}`}
    >
      {children}
    </button>
  );
}

function ConfirmDelete({ label, busy, onCancel, onConfirm }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm backdrop-blur-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 shadow-lg"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <AlertCircle size={16} className="text-red-500 shrink-0" />
      <span className="text-slate-900 dark:text-slate-100 font-medium truncate">Delete "{label}"?</span>
      <button
        onClick={onConfirm}
        disabled={busy}
        className="ml-auto px-3 py-1 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition shadow-md shadow-red-500/20 cursor-pointer"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      <button
        onClick={onCancel}
        disabled={busy}
        className="px-3 py-1 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}

// Detailed View Modal for Modules or Lessons
function ItemDetailModal({ title, subtitle, dataItems, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 relative text-slate-900 dark:text-slate-100 max-h-[85vh] overflow-y-auto"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full">
              Detailed Inspector View
            </span>
            <h3 className="text-xl font-bold font-fraunces mt-1">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {dataItems.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{item.label}</span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white whitespace-pre-wrap">{item.value || "Not provided"}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-purple-600 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Lesson Watch Analytics View with Real Course Enrollments, Search & Serial Number (#)
function LessonAnalyticsView({ lesson, courseId, onBack }) {
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoadingEnrollments(true);
        const response = await getEnrollments();
        const d = response?.data;
        const allEnrollments = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];

        const courseEnrollments = allEnrollments.filter((e) => {
          const c = e.batch?.course;
          const cId = c?.id || c?._id || e.courseId;
          return String(cId) === String(courseId);
        });

        if (isMounted) setEnrolledStudents(courseEnrollments);
      } catch (err) {
        console.error("Failed to load course enrollments for lesson analytics", err);
      } finally {
        if (isMounted) setLoadingEnrollments(false);
      }
    })();
    return () => { isMounted = false; };
  }, [courseId]);

  // Filter students based on search query (Name or Email)
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(enrolledStudents)) return [];
    const q = analyticsSearchQuery.toLowerCase().trim();
    if (!q) return enrolledStudents;

    return enrolledStudents.filter((enrollment) => {
      const studentName = (enrollment.studentName || enrollment.user?.name || "").toLowerCase();
      const studentEmail = (enrollment.studentEmail || enrollment.user?.email || "").toLowerCase();
      return studentName.includes(q) || studentEmail.includes(q);
    });
  }, [enrolledStudents, analyticsSearchQuery]);

  return (
    <div className="space-y-6 animate-fade-in" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
            Enrolled Students Video Analytics
          </span>
          <h3 className="text-lg font-bold font-fraunces mt-1 text-slate-900 dark:text-white">{lesson.title}</h3>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer"
        >
          ← Back to Lessons
        </button>
      </div>

      {/* Search Input Bar for Analytics Table */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={analyticsSearchQuery}
            onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
            placeholder="Search by student name or email..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-md text-slate-900 dark:text-white transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
              <th className="py-3 px-3 w-12">#</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Watch Progress</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
            {loadingEnrollments ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400">
                  <Loader2 size={16} className="animate-spin mx-auto mb-1" /> Loading enrolled students from backend...
                </td>
              </tr>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((enrollment, index) => {
                const studentName = enrollment.studentName || enrollment.user?.name || "Enrolled Student";
                const studentEmail = enrollment.studentEmail || enrollment.user?.email || "N/A";
                const watchPercentage = 100;

                return (
                  <tr key={enrollment.id || enrollment._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{studentName}</td>
                    <td className="py-3 px-4 text-slate-500">{studentEmail}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{watchPercentage}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Completed
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400">
                  No matching student records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModuleForm({ initial, saving, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");

  return (
    <div
      className="p-5 rounded-3xl space-y-4 backdrop-blur-2xl bg-white/70 dark:bg-[#1a1e2b]/80 border border-white/40 dark:border-slate-700/60 shadow-xl transition-all"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Module title
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Foundations of JavaScript"
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white backdrop-blur-md transition-all"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will students learn in this module?"
          rows={2}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white backdrop-blur-md transition-all"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          disabled={!title.trim() || saving}
          onClick={() => onSave({ title: title.trim(), description: description.trim() })}
          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-purple-600 transition cursor-pointer"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save module
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function LessonForm({ initial, saving, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [duration, setDuration] = useState(initial?.duration || "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl || "");
  const [content, setContent] = useState(initial?.content || "");

  return (
    <div
      className="p-5 rounded-3xl space-y-4 backdrop-blur-2xl bg-white/70 dark:bg-[#1a1e2b]/80 border border-white/40 dark:border-slate-700/60 shadow-xl transition-all"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Lesson title
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Variables & Data Types"
            className="mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white backdrop-blur-md transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Duration
          </label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="18 min"
            className="mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white backdrop-blur-md transition-all"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Description
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One line summary shown in the lesson list"
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white backdrop-blur-md transition-all"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Video URL (Online Link)
        </label>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://example.com/video.mp4"
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white backdrop-blur-md transition-all"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Learning content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Lesson body / notes shown to students"
          rows={3}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white backdrop-blur-md transition-all"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          disabled={!title.trim() || saving}
          onClick={() =>
            onSave({
              title: title.trim(),
              description: description.trim(),
              duration: duration.trim(),
              videoUrl: videoUrl.trim(),
              content: content.trim(),
            })
          }
          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-purple-600 transition cursor-pointer"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save lesson
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ModuleLessonManager({ initialCourseId = null }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [searchQuery, setSearchQuery] = useState("");

  const modules = useSelector(selectModules);
  const modulesLoading = useSelector(selectModulesLoading);
  const modulesError = useSelector(selectModulesError);

  const [selectedId, setSelectedId] = useState(null);
  const [moduleFormMode, setModuleFormMode] = useState(null);
  const [lessonFormMode, setLessonFormMode] = useState(null);
  const [selectedLessonForAnalytics, setSelectedLessonForAnalytics] = useState(null);
  const [viewingModuleDetails, setViewingModuleDetails] = useState(null);
  const [viewingLessonDetails, setViewingLessonDetails] = useState(null);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState(null);
  const [savingModuleId, setSavingModuleId] = useState(null);
  const [savingLessonId, setSavingLessonId] = useState(null);
  const [deletingModuleId, setDeletingModuleId] = useState(null);
  const [deletingLessonId, setDeletingLessonId] = useState(null);

  const lessons = useSelector(selectLessonsByModuleId(selectedId));
  const lessonsLoading = useSelector(selectLessonsLoading);
  const lessonsError = useSelector(selectLessonsError);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setCoursesLoading(true);
        const response = await getCourses();
        const d = response?.data;

        const list =
          Array.isArray(d) ? d :
            Array.isArray(d?.data) ? d.data :
              Array.isArray(d?.courses) ? d.courses :
                Array.isArray(d?.rows) ? d.rows :
                  Array.isArray(d?.items) ? d.items :
                    Array.isArray(d?.data?.courses) ? d.data.courses :
                      [];

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
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (modulesError) {
      toast.error(modulesError, { theme: "dark" });
      dispatch(clearModuleError());
    }
  }, [modulesError, dispatch]);

  useEffect(() => {
    if (lessonsError) {
      toast.error(lessonsError, { theme: "dark" });
      dispatch(clearLessonError());
    }
  }, [lessonsError, dispatch]);

  useEffect(() => {
    if (selectedCourseId) dispatch(fetchModulesByCourseId(selectedCourseId));
    setSelectedId(null);
    setSelectedLessonForAnalytics(null);
  }, [selectedCourseId, dispatch]);

  useEffect(() => {
    if (modules.length && selectedId == null) {
      setSelectedId(modules[0].id);
    }
  }, [modules, selectedId]);

  useEffect(() => {
    if (selectedId != null) dispatch(fetchLessonsByModuleId(selectedId));
  }, [selectedId, dispatch]);

  const selectedModule = Array.isArray(modules) ? modules.find((m) => m.id === selectedId) || null : null;
  const selectedCourse = Array.isArray(courses) ? courses.find((c) => c.id === selectedCourseId) || null : null;

  const filteredCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    return courses.filter((c) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [courses, searchQuery]);

  const handleCreateModule = async (data) => {
    setSavingModuleId("new");
    try {
      const result = await dispatch(createModuleThunk({ ...data, courseId: selectedCourseId })).unwrap();
      setModuleFormMode(null);
      setSelectedId(result.id);
      toast.success("Module created", { theme: "dark" });
    } catch {
      // handled via slice error state
    } finally {
      setSavingModuleId(null);
    }
  };

  const handleSaveModule = async (id, data) => {
    setSavingModuleId(id);
    try {
      await dispatch(updateModuleThunk({ id, data })).unwrap();
      setModuleFormMode(null);
      toast.success("Module updated", { theme: "dark" });
    } catch {
      // handled via slice error state
    } finally {
      setSavingModuleId(null);
    }
  };

  const handleDeleteModule = async (id) => {
    setDeletingModuleId(id);
    try {
      await dispatch(deleteModuleThunk(id)).unwrap();
      setConfirmDeleteModule(null);
      if (selectedId === id) {
        const remaining = modules.filter((m) => m.id !== id);
        setSelectedId(remaining[0]?.id ?? null);
      }
      toast.success("Module deleted", { theme: "dark" });
    } catch {
      // handled via slice error state
    } finally {
      setDeletingModuleId(null);
    }
  };

  const handleCreateLesson = async (data) => {
    setSavingLessonId("new");
    try {
      await dispatch(createLessonThunk({ moduleId: selectedId, data })).unwrap();
      setLessonFormMode(null);
      toast.success("Lesson created", { theme: "dark" });
    } catch {
      // handled via slice error state
    } finally {
      setSavingLessonId(null);
    }
  };

  const handleSaveLesson = async (id, data) => {
    setSavingLessonId(id);
    try {
      await dispatch(updateLessonThunk({ id, moduleId: selectedId, data })).unwrap();
      setLessonFormMode(null);
      toast.success("Lesson updated", { theme: "dark" });
    } catch {
      // handled via slice error state
    } finally {
      setSavingLessonId(null);
    }
  };

  const handleDeleteLesson = async (id) => {
    setDeletingLessonId(id);
    try {
      await dispatch(deleteLessonThunk({ id, moduleId: selectedId })).unwrap();
      setConfirmDeleteLesson(null);
      toast.success("Lesson deleted", { theme: "dark" });
    } catch {
      // handled via slice error state
    } finally {
      setDeletingLessonId(null);
    }
  };

  const moveLesson = async (lesson, direction) => {
    const sorted = [...lessons].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((l) => l.id === lesson.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      dispatch(updateLessonThunk({ id: a.id, moduleId: selectedId, data: { order: b.order } })).unwrap(),
      dispatch(updateLessonThunk({ id: b.id, moduleId: selectedId, data: { order: a.order } })).unwrap(),
    ]).catch(() => { });
  };

  const sortedLessons = Array.isArray(lessons) ? [...lessons].sort((a, b) => a.order - b.order) : [];

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE6] to-[#E5E2D9] dark:from-[#0b0f17] dark:via-[#111827] dark:to-[#0f172a] text-slate-900 dark:text-[#f1f3f9] transition-colors duration-500 font-sans"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      {/* Module Details Modal */}
      {viewingModuleDetails && (
        <ItemDetailModal
          title={viewingModuleDetails.title}
          subtitle="Module Overview & Details"
          dataItems={[
            { label: "Description", value: viewingModuleDetails.description },
            { label: "Module ID", value: viewingModuleDetails.id },
            { label: "Display Order", value: (viewingModuleDetails.order != null ? Number(viewingModuleDetails.order) : 0) + 1 }
          ]}
          onClose={() => setViewingModuleDetails(null)}
        />
      )}

      {/* Lesson Details Modal */}
      {viewingLessonDetails && (
        <ItemDetailModal
          title={viewingLessonDetails.title}
          subtitle="Lesson Curriculum & Notes"
          dataItems={[
            { label: "Short Description", value: viewingLessonDetails.description },
            { label: "Duration", value: viewingLessonDetails.duration },
            { label: "Video Stream URL", value: viewingLessonDetails.videoUrl },
            { label: "Learning Content / Notes", value: viewingLessonDetails.content }
          ]}
          onClose={() => setViewingLessonDetails(null)}
        />
      )}

      {/* Header & Course Selection/Search Hub */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md bg-white/40 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 font-mono">
              Course Management Hub
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-1" style={{ fontFamily: "Fraunces, serif" }}>
              {selectedCourse ? selectedCourse.title : "Select a Course"}
            </h1>
            {selectedCourse && (
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>{modules.length} modules loaded</span>
                {modulesLoading && (
                  <span className="flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> syncing
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Search & Course Selector Card */}
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
              {filteredCourses.map((c) => (
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
            <FileText size={28} />
          </div>
          <h3 className="text-xl font-bold">No Course Selected</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {coursesLoading
              ? "Loading your course catalog…"
              : courses.length === 0
                ? "You don't have any available courses to manage right now."
                : "Search or pick a course from the selector above to manage its modules and lessons effortlessly."}
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Module Left Glass Panel (4 Spans) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-slate-700 dark:text-slate-300">
                    Modules
                  </h2>
                  <IconBtn tone="accent" title="Add module" onClick={() => setModuleFormMode("new")}>
                    <Plus size={16} />
                  </IconBtn>
                </div>

                {modulesLoading && modules.length === 0 && (
                  <div className="text-xs py-8 text-center text-slate-400">Loading modules…</div>
                )}

                <div className="space-y-2.5">
                  {modules
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((m, i) => {
                      const displayModuleNum = (m.order != null ? Number(m.order) : i) + 1;
                      return (
                        <div key={m.id}>
                          {moduleFormMode === m.id ? (
                            <ModuleForm
                              initial={m}
                              saving={savingModuleId === m.id}
                              onCancel={() => setModuleFormMode(null)}
                              onSave={(data) => handleSaveModule(m.id, data)}
                            />
                          ) : confirmDeleteModule === m.id ? (
                            <ConfirmDelete
                              label={m.title}
                              busy={deletingModuleId === m.id}
                              onCancel={() => setConfirmDeleteModule(null)}
                              onConfirm={() => handleDeleteModule(m.id)}
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedId(m.id);
                                setSelectedLessonForAnalytics(null);
                              }}
                              className={`w-full text-left p-3.5 rounded-2xl flex items-start gap-3 group transition-all duration-300 backdrop-blur-md cursor-pointer ${selectedId === m.id
                                ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25 border border-white/20 font-medium"
                                : "bg-white/40 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 shadow-sm"
                                }`}
                            >
                              <span
                                className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 font-mono ${selectedId === m.id
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                  }`}
                              >
                                {displayModuleNum}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-semibold truncate">{m.title}</span>
                                {m.description && (
                                  <span className={`block text-[10px] mt-0.5 truncate ${selectedId === m.id ? "text-white/80" : "text-slate-400"}`}>
                                    {m.description}
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingModuleDetails(m);
                                  }}
                                  className={`p-1 rounded-lg hover:bg-black/10 ${selectedId === m.id ? "text-white" : "text-slate-400"}`}
                                  title="View module details"
                                >
                                  <Eye size={13} />
                                </span>
                                <span
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModuleFormMode(m.id);
                                  }}
                                  className={`p-1 rounded-lg hover:bg-black/10 ${selectedId === m.id ? "text-white" : "text-slate-400"}`}
                                >
                                  <Pencil size={13} />
                                </span>
                                <span
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteModule(m.id);
                                  }}
                                  className={`p-1 rounded-lg hover:bg-black/10 ${selectedId === m.id ? "text-white" : "text-slate-400"}`}
                                >
                                  <Trash2 size={13} />
                                </span>
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}

                  {moduleFormMode === "new" && (
                    <ModuleForm saving={savingModuleId === "new"} onCancel={() => setModuleFormMode(null)} onSave={handleCreateModule} />
                  )}

                  {!modulesLoading && modules.length === 0 && moduleFormMode !== "new" && (
                    <div className="p-6 flex flex-col items-center justify-center rounded-2xl text-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                      <span className="text-xs">No modules yet in this course</span>
                      <button onClick={() => setModuleFormMode("new")} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                        Add the first module
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lessons Right Glass Panel (8 Spans) */}
            <div className="lg:col-span-8">
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl min-h-[500px]">
                {!selectedModule ? (
                  <div className="h-64 flex flex-col items-center justify-center rounded-2xl text-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                    <FileText size={24} />
                    <span className="text-xs">Select a module from the left panel to view its lessons</span>
                  </div>
                ) : selectedLessonForAnalytics ? (
                  <LessonAnalyticsView
                    lesson={selectedLessonForAnalytics}
                    courseId={selectedCourseId}
                    onBack={() => setSelectedLessonForAnalytics(null)}
                  />
                ) : (
                  <>
                    <div className="mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/60 flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "Fraunces, serif" }}>
                          {selectedModule.title} — Lessons
                        </h2>
                        {selectedModule.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {selectedModule.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {sortedLessons.length} Lessons
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-slate-700 dark:text-slate-300">
                        Lesson Curriculum
                      </h3>
                      <IconBtn tone="accent" title="Add lesson" onClick={() => setLessonFormMode("new")}>
                        <Plus size={16} />
                      </IconBtn>
                    </div>

                    {lessonsLoading && sortedLessons.length === 0 && (
                      <div className="text-xs py-8 text-center text-slate-400">Loading lessons…</div>
                    )}

                    <div className="space-y-3">
                      {!lessonsLoading && sortedLessons.length === 0 && lessonFormMode !== "new" && (
                        <div className="p-8 flex flex-col items-center justify-center rounded-2xl text-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                          <span className="text-xs">No lessons yet in this module</span>
                          <button onClick={() => setLessonFormMode("new")} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                            Add the first lesson
                          </button>
                        </div>
                      )}

                      {sortedLessons.map((l, idx) => {
                        const displayLessonNum = (l.order != null ? Number(l.order) : idx) + 1;
                        return (
                          <div key={l.id}>
                            {lessonFormMode === l.id ? (
                              <LessonForm
                                initial={l}
                                saving={savingLessonId === l.id}
                                onCancel={() => setLessonFormMode(null)}
                                onSave={(data) => handleSaveLesson(l.id, data)}
                              />
                            ) : confirmDeleteLesson === l.id ? (
                              <ConfirmDelete
                                label={l.title}
                                busy={deletingLessonId === l.id}
                                onCancel={() => setConfirmDeleteLesson(null)}
                                onConfirm={() => handleDeleteLesson(l.id)}
                              />
                            ) : (
                              <div className="p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group backdrop-blur-md bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:bg-white/70 dark:hover:bg-slate-800/70">
                                <div className="flex items-start gap-4">
                                  <div className="flex flex-col items-center gap-1 pt-0.5">
                                    <button disabled={idx === 0} onClick={() => moveLesson(l, "up")} className="disabled:opacity-20 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                      <ChevronUp size={14} />
                                    </button>
                                    <span className="text-xs font-semibold font-mono text-amber-600 dark:text-amber-400">
                                      {displayLessonNum}
                                    </span>
                                    <button
                                      disabled={idx === sortedLessons.length - 1}
                                      onClick={() => moveLesson(l, "down")}
                                      className="disabled:opacity-20 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {l.title}
                                    </div>
                                    {l.description && (
                                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {l.description}
                                      </div>
                                    )}
                                    {l.duration && (
                                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 font-mono">
                                        <Clock size={12} />
                                        {l.duration}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  <button
                                    onClick={() => setViewingLessonDetails(l)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition flex items-center gap-1 cursor-pointer"
                                    title="View full lesson details & notes"
                                  >
                                    <Eye size={13} /> View Details
                                  </button>

                                  <button
                                    onClick={() => setSelectedLessonForAnalytics(l)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition flex items-center gap-1 cursor-pointer"
                                    title="View enrolled students watch percentage analytics"
                                  >
                                    <BarChart2 size={13} /> Students Watch Analytics
                                  </button>

                                  <button
                                    onClick={() => navigate(`/instructor/courses/${selectedCourseId}/videos/${l.id}`)}
                                    className="p-2 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition flex items-center gap-1 cursor-pointer"
                                    title="Watch / Preview Lesson Video"
                                  >
                                    <Video size={14} />
                                  </button>

                                  <IconBtn title="Edit lesson" onClick={() => setLessonFormMode(l.id)}>
                                    <Pencil size={14} />
                                  </IconBtn>
                                  <IconBtn title="Delete lesson" tone="danger" onClick={() => setConfirmDeleteLesson(l.id)}>
                                    <Trash2 size={14} />
                                  </IconBtn>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {lessonFormMode === "new" && (
                        <LessonForm saving={savingLessonId === "new"} onCancel={() => setLessonFormMode(null)} onSave={handleCreateLesson} />
                      )}
                    </div>
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
