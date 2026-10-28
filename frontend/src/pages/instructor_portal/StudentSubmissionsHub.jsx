import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { 
  Search, 
  Filter, 
  BookOpen, 
  Award, 
  Video, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Eye, 
  UserCheck, 
  Layers
} from "lucide-react";

import { getEnrollments } from "../../api/enrollmentApi";
import { getCourses } from "../../api/courseApi";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`;

export default function StudentSubmissionsHub() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'ongoing', 'completed'
  const [activeTab, setActiveTab] = useState("ongoing"); // 'ongoing', 'completed'

  // Fetch all enrollments from backend
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getEnrollments();
        const d = res?.data;
        const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];

        // Enrich enrollments with telemetry attributes
        const enriched = list.map((e, index) => {
          const courseObj = e.batch?.course || e.course;
          const courseId = courseObj?.id || courseObj?._id || e.courseId || 1;
          const courseName = courseObj?.title || e.courseTitle || "Java Backend & Spring Boot";

          return {
            id: e.id || e._id || index,
            courseId: courseId,
            studentName: e.studentName || e.user?.name || "Student Name",
            studentEmail: e.studentEmail || e.user?.email || "student@thinkz.ai",
            courseName: courseName,
            moduleName: e.currentModule || "Module 3: REST API Architecture",
            // The tab must only filter records. It must never change a learner's
            // completion state while the instructor is viewing the page.
            isCompleted:
              e.completed === true || String(e.status || "").toLowerCase() === "completed",
          };
        });

        if (isMounted) setEnrollments(enriched);
      } catch (err) {
        console.error("Failed to load enrollments", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Filter and Search Logic
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((item) => {
      // Tab filter (Ongoing vs Completed)
      const tabMatch = activeTab === "completed" ? item.isCompleted : !item.isCompleted;
      if (!tabMatch) return false;

      // Status dropdown filter
      if (statusFilter === "ongoing" && item.isCompleted) return false;
      if (statusFilter === "completed" && !item.isCompleted) return false;

      // Search Query (Student Name, Course Name, Module Name, Email)
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        item.studentName.toLowerCase().includes(q) ||
        item.studentEmail.toLowerCase().includes(q) ||
        item.courseName.toLowerCase().includes(q) ||
        item.moduleName.toLowerCase().includes(q)
      );
    });
  }, [enrollments, activeTab, statusFilter, searchQuery]);

  return (
    <div 
      className="min-h-screen w-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE6] to-[#E5E2D9] dark:from-[#0b0f17] dark:via-[#111827] dark:to-[#0f172a] text-slate-900 dark:text-[#f1f3f9] p-6 sm:p-8 font-sans transition-colors duration-500"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Hub */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200/60 dark:border-slate-800 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 font-mono">
              Instructor Telemetry Hub
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-1" style={{ fontFamily: "Fraunces, serif" }}>
              Student Submissions &amp; Course Progress
            </h1>
          </div>

          {/* Tab Switcher: Ongoing vs Completed */}
          <div className="flex items-center p-1 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
              onClick={() => setActiveTab("ongoing")}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "ongoing"
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Ongoing Courses
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "completed"
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Completed Courses
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student, course, or module..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-md text-slate-900 dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Enrolled Students Table */}
        <div className="backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-x-auto min-h-[400px]">
          <table className="w-full min-w-[980px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-3 w-12">#</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Enrolled Course</th>
                <th className="py-3 px-4">Current Module</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-mono text-xs">
                    <Loader2 size={18} className="animate-spin mx-auto mb-2 text-purple-500" /> Loading student telemetry database...
                  </td>
                </tr>
              ) : filteredEnrollments.length > 0 ? (
                filteredEnrollments.map((enrollment, index) => (
                  <tr key={enrollment.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-400">{index + 1}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCheck size={14} className="text-purple-500 shrink-0" /> {enrollment.studentName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{enrollment.studentEmail}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{enrollment.courseName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 flex items-center gap-1.5">
                      <Layers size={13} className="text-purple-500 shrink-0" /> {enrollment.moduleName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
                        enrollment.isCompleted 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      }`}>
                        {enrollment.isCompleted ? "Completed Course" : "Ongoing Course"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/instructor/courses/${enrollment.courseId}/students/${enrollment.id}/submissions`)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition flex items-center gap-1.5 ml-auto cursor-pointer"
                        title="View complete lesson progress & assignment marks"
                      >
                        <Eye size={13} /> View Telemetry
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-mono text-xs">
                    No student records match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
