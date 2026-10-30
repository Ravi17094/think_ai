import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { selectUser } from '../../features/auth/authSlice';
import { fetchMyEnrollments, selectMyEnrollments } from '../../features/enrollments/enrollmentSlice';
import { fetchModulesByCourseId, selectModules, selectModulesLoading } from '../../features/modules/moduleSlice';
import { fetchLessonsByModuleId, selectLessonsByModuleId } from '../../features/lessons/lessonSlice';
import {
  fetchProgressByEnrollment,
  fetchProgressSummary,
  markLessonComplete,
  selectIsLessonComplete,
  selectProgressSummaryFor,
} from '../../features/lessonProgress/lessonProgressSlice';

function ModuleLessons({ moduleId, currentLessonId, onSelectLesson }) {
  const dispatch = useDispatch();
  const lessons = useSelector(selectLessonsByModuleId(moduleId));

  useEffect(() => {
    dispatch(fetchLessonsByModuleId(moduleId));
  }, [dispatch, moduleId]);

  if (lessons.length === 0) {
    return <p className="p-3 pl-8 text-xs text-slate-400">No lessons yet.</p>;
  }

  return (
    <div className="bg-transparent space-y-1 py-1">
      {lessons.map((lesson) => (
        <LessonRow
          key={lesson.id}
          lesson={lesson}
          isActive={currentLessonId === lesson.id}
          onSelect={() => onSelectLesson(lesson)}
        />
      ))}
    </div>
  );
}

function LessonRow({ lesson, isActive, onSelect }) {
  const isComplete = useSelector(selectIsLessonComplete(lesson.id));

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer ${isActive
        ? 'bg-indigo-600 text-white font-medium shadow-sm'
        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
        }`}
    >
      <span className="flex items-center space-x-2 truncate pr-2">
        {isComplete ? (
          <i className="fa-solid fa-circle-check text-emerald-500"></i>
        ) : (
          <i className="fa-regular fa-circle text-slate-400 text-[10px]"></i>
        )}
        <span className="truncate">{lesson.title}</span>
      </span>
      <span className="shrink-0 opacity-70 text-[10px]">{lesson.duration || ''}</span>
    </button>
  );
}

export default function CoursePlayer() {
  const { id: courseId } = useParams();
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);

  const user = useSelector(selectUser);
  const enrollments = useSelector(selectMyEnrollments);
  const modules = useSelector(selectModules);
  const modulesLoading = useSelector(selectModulesLoading);

  const [activeModule, setActiveModule] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (enrollments.length === 0 && user?.email) {
      dispatch(fetchMyEnrollments(user.email));
    }
  }, [dispatch, enrollments.length, user?.email]);

  const enrollment = useMemo(() => {
    return enrollments.find((e) => {
      const c = e.batch?.course;
      const cId = c?.id || c?._id;
      return String(cId) === String(courseId);
    }) || null;
  }, [enrollments, courseId]);

  const enrollmentId = enrollment?.id ?? null;
  const course = enrollment?.batch?.course;
  const summary = useSelector(selectProgressSummaryFor(enrollmentId));

  useEffect(() => {
    if (courseId) dispatch(fetchModulesByCourseId(courseId));
  }, [dispatch, courseId]);

  useEffect(() => {
    if (enrollmentId) {
      dispatch(fetchProgressByEnrollment(enrollmentId));
      dispatch(fetchProgressSummary(enrollmentId));
    }
  }, [dispatch, enrollmentId]);

  useEffect(() => {
    if (modules.length > 0 && !activeModule) {
      setActiveModule(modules[0].id);
    }
  }, [modules, activeModule]);

  const showFeedback = (text) => {
    setFeedback(text);
    setTimeout(() => setFeedback(null), 800);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const video = videoRef.current;
      if (!video) return;

      if (e.code === 'Space') {
        e.preventDefault();
        video.paused ? video.play() : video.pause();
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
        showFeedback('+5s ⏩');
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        showFeedback('⏪ -5s');
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        const v = Math.min(1, video.volume + 0.05);
        video.volume = v;
        showFeedback(`Volume: ${Math.round(v * 100)}% 🔊`);
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        const v = Math.max(0, video.volume - 0.05);
        video.volume = v;
        showFeedback(`Volume: ${Math.round(v * 100)}% 🔉`);
      }
      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const container = videoContainerRef.current;
        if (!document.fullscreenElement) {
          container?.requestFullscreen?.();
          showFeedback('Fullscreen ON ⛶');
        } else {
          document.exitFullscreen?.();
          showFeedback('Fullscreen OFF ⛶');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleVideoEnded = () => {
    if (currentLesson && enrollmentId) {
      dispatch(markLessonComplete({ lessonId: currentLesson.id, enrollmentId }));
    }
  };

  const handleMarkComplete = () => {
    if (currentLesson && enrollmentId) {
      dispatch(markLessonComplete({ lessonId: currentLesson.id, enrollmentId }));
      showFeedback('Marked Complete ✓');
    }
  };

  if (!user?.email) {
    return <div className="p-6 text-sm text-slate-400">Loading your account…</div>;
  }
  if (enrollments.length > 0 && !enrollment) {
    return <div className="p-6 text-sm text-rose-500">You're not enrolled in this course.</div>;
  }
  if (!enrollment || modulesLoading) {
    return <div className="p-6 text-sm text-slate-400">Loading course…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#131314] text-slate-900 dark:text-[#e3e3e3] font-sans transition-colors duration-300">
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Course Player & Interactive Tabs */}
        <div className="lg:col-span-2 flex flex-col space-y-6">

          {/* Course Player Box with Glassy Border */}
          <div className="bg-white dark:bg-[#1f1f23]/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div
              ref={videoContainerRef}
              className="relative bg-black aspect-video flex items-center justify-center group"
            >
              {currentLesson ? (
                <video
                  ref={videoRef}
                  src={currentLesson.videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  autoPlay
                  onEnded={handleVideoEnded}
                />
              ) : (
                <div className="text-center p-6">
                  <img
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200"
                    alt="Lesson Thumbnail"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  <div className="absolute inset-0 bg-slate-950/60"></div>
                  <p className="relative z-10 text-slate-200 text-sm font-medium">Select a lesson from the curriculum to begin</p>
                </div>
              )}

              {feedback && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-lg font-semibold shadow-2xl border border-white/10">
                    {feedback}
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Metadata */}
            <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                  {course?.title || 'Course Details'}
                </span>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {currentLesson?.title || 'No lesson selected'}
                </h1>
              </div>
              <button
                onClick={handleMarkComplete}
                className="bg-indigo-50 dark:bg-purple-600/20 hover:bg-indigo-100 dark:hover:bg-purple-600/30 text-indigo-600 dark:text-purple-300 border border-indigo-200 dark:border-purple-500/30 px-4 py-2 rounded-xl text-sm font-medium transition flex items-center space-x-2 cursor-pointer"
              >
                <i className="fa-solid fa-check"></i>
                <span>Mark as Complete</span>
              </button>
            </div>
          </div>

          {/* Interactive Tabs: Notes / Resources / Discussion with Glassy Border */}
          <div className="bg-white dark:bg-[#1f1f23]/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <div className="flex space-x-6 border-b border-slate-200 dark:border-white/10 pb-3 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('notes')}
                className={`${activeTab === 'notes' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-3 -mb-3' : 'text-slate-500 dark:text-[#c4c7c5] hover:text-slate-800 dark:hover:text-white'} transition cursor-pointer`}
              >
                Lesson Notes
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`${activeTab === 'resources' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-3 -mb-3' : 'text-slate-500 dark:text-[#c4c7c5] hover:text-slate-800 dark:hover:text-white'} transition cursor-pointer`}
              >
                Resources (3)
              </button>
              <button
                onClick={() => setActiveTab('discussion')}
                className={`${activeTab === 'discussion' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-3 -mb-3' : 'text-slate-500 dark:text-[#c4c7c5] hover:text-slate-800 dark:hover:text-white'} transition cursor-pointer`}
              >
                Discussion (12)
              </button>
            </div>

            {activeTab === 'notes' && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Take private notes for this lesson... (saved locally)"
                  className="w-full bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-800 dark:text-[#e3e3e3] focus:outline-none focus:border-indigo-500 resize-none h-24"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => alert('Note saved successfully!')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="mt-4 text-sm text-slate-600 dark:text-[#c4c7c5] space-y-2">
                <div className="p-3 bg-slate-50 dark:bg-[#131314] rounded-xl border border-slate-200 dark:border-white/10 flex justify-between items-center">
                  <span><i className="fa-solid fa-file-pdf text-rose-500 mr-2"></i> Lecture_Slides_Module3.pdf</span>
                  <button className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-xs cursor-pointer">Download</button>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#131314] rounded-xl border border-slate-200 dark:border-white/10 flex justify-between items-center">
                  <span><i className="fa-solid fa-code text-cyan-500 mr-2"></i> starter-code-repo.zip</span>
                  <button className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-xs cursor-pointer">Download</button>
                </div>
              </div>
            )}

            {activeTab === 'discussion' && (
              <div className="mt-4 text-sm text-slate-600 dark:text-[#c4c7c5]">
                <p className="text-xs italic">Discussion stream loaded. Join the community thread below.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Progress Tracker & Course Content */}
        <div className="space-y-6">

          {/* Progress Tracker Widget with Glassy Border */}
          <div className="bg-gradient-to-br from-white to-indigo-50/50 dark:from-[#1f1f23]/90 dark:to-[#131314]/90 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Overall Progress</h3>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {summary ? `${summary.completionPercentage}% Completed` : '0% Completed'}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden mb-4">
              <div
                className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${summary?.completionPercentage || 0}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-[#131314]/60 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {summary ? `${summary.completedLessons}/${summary.totalLessons}` : '0/0'}
                </span>
                <p className="text-xs text-slate-500 dark:text-[#c4c7c5] mt-0.5">Lessons Done</p>
              </div>
              <div className="bg-slate-50 dark:bg-[#131314]/60 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">Active</span>
                <p className="text-xs text-slate-500 dark:text-[#c4c7c5] mt-0.5">Status</p>
              </div>
            </div>
          </div>

          {/* Upcoming Live Sessions with Glassy Border */}
          <div className="bg-white dark:bg-[#1f1f23]/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center justify-between">
              <span>Upcoming Sessions</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            </h3>
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-[#131314] p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">Live Q&A</span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">React Router v6 Deep Dive</h4>
                  <p className="text-xs text-slate-500 dark:text-[#c4c7c5] mt-0.5"><i className="fa-regular fa-clock mr-1"></i> Today, 5:00 PM</p>
                </div>
                <button className="bg-slate-200 dark:bg-white/10 hover:bg-indigo-600 hover:text-white text-slate-800 dark:text-white text-xs px-3 py-2 rounded-lg transition font-medium cursor-pointer">Join</button>
              </div>
            </div>
          </div>

          {/* Course Curriculum with Glassy Border */}
          <div className="bg-white dark:bg-[#1f1f23]/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Course Curriculum</h3>

            <div className="space-y-2 text-sm">
              {modules.length === 0 && (
                <p className="text-xs text-slate-400 p-2">No modules yet for this course.</p>
              )}

              {modules.map((module) => {
                const isExpanded = activeModule === module.id;
                return (
                  <div key={module.id} className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveModule(isExpanded ? null : module.id)}
                      className="w-full p-3 bg-slate-50 dark:bg-[#131314] flex items-center justify-center sm:justify-between cursor-pointer font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                    >
                      <span className="text-xs font-semibold truncate pr-2">{module.title}</span>
                      <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-xs text-slate-400`}></i>
                    </button>

                    {isExpanded && (
                      <div className="px-2 pb-2 bg-slate-50/50 dark:bg-[#131314]/40">
                        <ModuleLessons
                          moduleId={module.id}
                          currentLessonId={currentLesson?.id}
                          onSelectLesson={setCurrentLesson}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}