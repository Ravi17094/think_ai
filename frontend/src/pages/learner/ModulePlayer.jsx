import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { selectUser } from '../../features/auth/authSlice';
import { fetchMyEnrollments, selectMyEnrollments } from '../../features/enrollments/enrollmentSlice';
import { fetchModuleById, selectCurrentModule } from '../../features/modules/moduleSlice';
import { fetchLessonsByModuleId, selectLessonsByModuleId } from '../../features/lessons/lessonSlice';
import {
  fetchProgressByEnrollment,
  fetchProgressSummary,
  markLessonComplete,
  selectIsLessonComplete,
} from '../../features/lessonProgress/lessonProgressSlice';

function LessonRow({ lesson, isActive, onSelect }) {
  const isComplete = useSelector(selectIsLessonComplete(lesson.id));
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-3 pl-4 text-sm transition-all border-l-2 rounded-r-lg ${
        isActive
          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-medium'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      <span className="flex items-center gap-2 truncate pr-4">
        {isComplete && <span className="text-emerald-500 text-xs">✓</span>}
        {lesson.title}
      </span>
      <span className="text-xs shrink-0 opacity-60">{lesson.duration || ''}</span>
    </button>
  );
}

export default function ModulePlayer() {
  const { courseId, moduleId } = useParams();
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);

  const user = useSelector(selectUser);
  const enrollments = useSelector(selectMyEnrollments);
  const module = useSelector(selectCurrentModule);
  const lessons = useSelector(selectLessonsByModuleId(moduleId));

  const [currentLesson, setCurrentLesson] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (enrollments.length === 0 && user?.email) {
      dispatch(fetchMyEnrollments(user.email));
    }
  }, [dispatch, enrollments.length, user?.email]);

  const enrollment = useMemo(
    () => enrollments.find((e) => e.batch?.course?.id === Number(courseId)) || null,
    [enrollments, courseId]
  );
  const enrollmentId = enrollment?.id ?? null;

  useEffect(() => {
    if (moduleId) {
      dispatch(fetchModuleById(moduleId));
      dispatch(fetchLessonsByModuleId(moduleId));
    }
  }, [dispatch, moduleId]);

  useEffect(() => {
    if (enrollmentId) {
      dispatch(fetchProgressByEnrollment(enrollmentId));
    }
  }, [dispatch, enrollmentId]);

  useEffect(() => {
    if (lessons.length > 0 && !currentLesson) {
      setCurrentLesson(lessons[0]);
    }
  }, [lessons, currentLesson]);

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
      dispatch(markLessonComplete({ lessonId: currentLesson.id, enrollmentId }))
        .then(() => dispatch(fetchProgressSummary(enrollmentId)));
    }
  };

  if (!enrollment) {
    return <div className="p-6 text-sm text-neutral-400">Loading module…</div>;
  }

  return (
    <div className="space-y-4">
      <Link
        to={`/learner/courses/${courseId}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        ← Back to modules
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-11rem)]">
        {/* LEFT: video */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div
            ref={videoContainerRef}
            className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center"
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
              <p className="text-gray-400 text-sm">No lessons in this module yet</p>
            )}

            {feedback && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-lg font-semibold shadow-2xl border border-white/10">
                  {feedback}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#151025]/50 backdrop-blur-md rounded-2xl p-6 border border-gray-200 dark:border-purple-500/20 shadow-sm">
            <p className="text-xs font-mono text-[var(--accent-to)]/80">{module?.title}</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-purple-100">
              {currentLesson?.title || 'No lesson selected'}
            </h1>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded mr-1">Space</kbd> Play/Pause</span>
              <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded mr-1">← / →</kbd> ±5s Seek</span>
              <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded mr-1">↑ / ↓</kbd> Vol ±5%</span>
              <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded mr-1">F</kbd> Fullscreen</span>
            </div>
          </div>
        </div>

        {/* RIGHT: lesson list */}
        <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-[#151025]/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-purple-500/20 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-purple-500/20 shrink-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-purple-100">Lessons</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {lessons.length === 0 && (
              <p className="p-3 text-xs text-gray-400">No lessons yet.</p>
            )}
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                isActive={currentLesson?.id === lesson.id}
                onSelect={() => setCurrentLesson(lesson)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}