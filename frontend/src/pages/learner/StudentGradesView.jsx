import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Award, CheckCircle, Loader2, XCircle } from "lucide-react";
import api from "../../api/axios";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`;

export default function StudentGradesView() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assessmentStatus, setAssessmentStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        // Get active enrollment ID for this student
        const enrollmentId = localStorage.getItem("activeEnrollmentId") || 1;

        // Call your backend endpoint: GET /api/assessments/enrollment/:enrollmentId/status
        const res = await api.get(`/assessments/enrollment/${enrollmentId}/status`);
        const data = res.data?.data || res.data;

        if (isMounted) setAssessmentStatus(data);
      } catch (err) {
        console.error("Failed to load student assessment status/grades", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [courseId]);

  return (
    <div
      className="min-h-full w-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE6] to-[#E5E2D9] dark:from-[#0b0f17] dark:via-[#111827] dark:to-[#0f172a] text-slate-900 dark:text-[#f1f3f9] p-6 sm:p-8 font-sans transition-colors duration-500"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-fraunces">My Assessment Grades</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">Review your scores, percentage results, and course completion status.</p>
        </div>

        {/* Summary Metric Cards */}
        {assessmentStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 shadow-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Assessments</span>
              <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">{assessmentStatus.totalAssessments}</p>
            </div>
            <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 shadow-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Passed Assessments</span>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">{assessmentStatus.passedAssessments}</p>
            </div>
            <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 shadow-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Course Clearance</span>
              <p className={`text-sm font-bold font-mono mt-2 uppercase ${assessmentStatus.allPassed ? 'text-emerald-500' : 'text-amber-500'}`}>
                {assessmentStatus.allPassed ? 'Cleared / Eligible' : 'In Progress'}
              </p>
            </div>
          </div>
        )}

        {/* Assessments List Table */}
        <div className="backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Assessment Title</th>
                <th className="py-3 px-4">Attempt Status</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400 font-mono">
                    <Loader2 size={16} className="animate-spin mx-auto mb-1 text-emerald-500" /> Loading gradebook...
                  </td>
                </tr>
              ) : assessmentStatus?.assessments?.length > 0 ? (
                assessmentStatus.assessments.map((g, idx) => (
                  <tr key={g.assessmentId || idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="py-4 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Award size={15} className="text-purple-500" /> {g.title}
                    </td>
                    <td className="py-4 px-4 font-mono">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${g.attempted
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}>
                        {g.attempted ? "Attempted" : "Not Attempted"}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {g.percentage != null ? `${Math.min(Number(g.percentage), 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-4 px-4">
                      {g.passed ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                          <CheckCircle size={12} /> Passed (&ge;40%)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 w-max">
                          <XCircle size={12} /> Needs Improvement
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400 font-mono">
                    No graded assessments found for this course.
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
