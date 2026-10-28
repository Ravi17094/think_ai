import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import { fetchMyEnrollments, selectMyEnrollments, selectEnrollmentLoading, selectEnrollmentError } from '../../features/enrollments/enrollmentSlice';
import { fetchProgressSummary, selectProgressSummaryFor } from '../../features/lessonProgress/lessonProgressSlice';

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true">
      <path d="M3 8.5 6.2 12 13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CourseCard({ enrollment, navigate }) {
  const dispatch = useDispatch();
  const enrollmentId = enrollment.id || enrollment._id;
  const summary = useSelector(selectProgressSummaryFor(enrollmentId));

  useEffect(() => {
    if (enrollmentId) {
      dispatch(fetchProgressSummary(enrollmentId));
    }
  }, [dispatch, enrollmentId]);

  const course = enrollment.batch?.course;
  const courseId = course?.id || course?._id;
  const progress = summary?.completionPercentage ?? 0;
  const totalLessons = summary?.totalLessons ?? 0;
  const completedLessons = summary?.completedLessons ?? 0;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-[#262b38]
                 bg-white dark:bg-[#1a1e2b] p-6 
                 backdrop-blur-2xl transition-all duration-500
                 hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:-translate-y-1"
    >
      <div className="absolute inset-y-0 left-0 w-[4px] bg-gradient-to-b from-purple-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]" />

      <div className="flex flex-col justify-between h-full space-y-6 pl-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
              BATCH: {enrollment.batch?.name || 'Standard'}
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {progress === 100 ? '🎉 Completed' : `${progress}% Done`}
            </span>
          </div>

          <h3 className="text-xl font-bold leading-snug text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
            {course?.title || 'Untitled Curriculum'}
          </h3>

          <p className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            <CheckIcon />
            {totalLessons > 0
              ? `${completedLessons} of ${totalLessons} modules completed`
              : 'Awaiting first lesson launch'}
          </p>
        </div>

        <div className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#222736]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400
                       shadow-[0_0_12px_rgba(168,85,247,0.6)] transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Status: Active Access
            </div>

            <button
              onClick={() => {
                if (courseId) {
                  navigate(`/learner/courses/${courseId}/videos`);
                } else {
                  console.error("Course ID is missing:", course);
                }
              }}
              className="group/btn relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/25 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Continue Learning</span>
              <span className="transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const enrollments = useSelector(selectMyEnrollments);
  const loading = useSelector(selectEnrollmentLoading);
  const error = useSelector(selectEnrollmentError);

  useEffect(() => {
    if (user?.email) {
      dispatch(fetchMyEnrollments(user.email));
    }
  }, [dispatch, user?.email]);

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center max-w-7xl mx-auto px-4">
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-mono">
          ⚠️ Error loading enrollment data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-slate-50 dark:bg-[#151821] text-slate-900 dark:text-[#f1f3f9] transition-colors duration-300 min-h-full">

      {/* Top Header Banner with Integrated Upcoming Sessions & Enrollments Count Widget */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#262b38] bg-white dark:bg-[#1a1e2b] p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Dashboard &amp; Curriculum <br/> <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">{user?.name || user?.email?.split('@')[0] || 'Learner'}</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-[#94a3b8]">
              Monitor active bootcamps, resume your interactive curriculum, and follow your module progress streams effortlessly.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Upcoming Live Sessions Widget */}
            <div className="flex-1 sm:flex-initial bg-slate-50 dark:bg-[#222736] border border-slate-200 dark:border-[#313849] rounded-2xl p-4 flex items-center justify-between gap-4 backdrop-blur-xl">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border border-emerald-500/20">Live Q&A</span>
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">React Router v6 Deep Dive</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Today, 5:00 PM</p>
              </div>
              <button className="bg-slate-200 dark:bg-purple-600/20 hover:bg-purple-600 hover:text-white text-slate-800 dark:text-purple-300 text-xs px-3.5 py-1.5 rounded-full transition font-medium cursor-pointer border border-purple-500/30">
                Join
              </button>
            </div>

            {/* Enrolled Programs Count Widget */}
            <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-slate-50 dark:bg-[#222736] border border-slate-200 dark:border-[#313849] backdrop-blur-xl">
              <FlameIcon />
              <div>
                <p className="text-[10px] uppercase font-mono text-slate-400">Enrolled Programs</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{enrollments.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Programs Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#262b38] pb-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <span className="text-purple-400">#</span> Enrolled Programs
          </h2>
          <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 font-mono text-xs text-purple-600 dark:text-purple-300">
            {enrollments.length} Enrolled
          </span>
        </div>

        {loading && enrollments.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 rounded-2xl bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-[#262b38] animate-pulse p-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-[#222736] rounded-full" />
                  <div className="h-6 w-3/4 bg-slate-200 dark:bg-[#222736] rounded-lg" />
                </div>
                <div className="h-10 bg-slate-200 dark:bg-[#222736] rounded-full" />
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-[#262b38] bg-white dark:bg-[#1a1e2b] p-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 text-2xl font-bold">
              🚀
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">You're not enrolled in any courses yet.</h3>
            <p className="text-sm text-slate-500 dark:text-[#94a3b8] max-w-md mx-auto">
              Explore available programs and bootcamps to begin tracking your lessons and certifications.
            </p>
            <button
              onClick={() => navigate('/learner/courses')}
              className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
            >
              Browse Course Catalog →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((enrollment) => (
              <CourseCard key={enrollment.id || enrollment._id} enrollment={enrollment} navigate={navigate} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
