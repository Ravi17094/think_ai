import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getLessonById } from "../../api/lessonApi";

export default function LessonDetails() {
  const { id } = useParams();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const response = await getLessonById(id);
      setLesson(response.data.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load lesson");
      setLesson(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-cyan-400 text-xl font-semibold animate-pulse">Loading Lesson...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-rose-400 text-xl font-semibold">Lesson not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Lesson - {lesson.title}</h1>
          <p className="text-sm text-gray-400 mt-1">Lesson information</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/lessons/edit/${lesson.id}`}
            className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            Edit Lesson
          </Link>
        </div>
      </div>

      <div className="bg-[#112435] border border-gray-800 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-cyan-500/20 border-2 border-teal-600 flex items-center justify-center text-3xl font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] text-center p-4">
              {lesson.order ?? "-"}
            </div>
          </div>

          <div className="flex-1 w-full space-y-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Lesson Title</p>
              <p className="text-lg font-medium text-white">{lesson.title}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Module</p>
              <p className="text-lg text-white">{lesson.module?.title || "N/A"}</p>
            </div>

            {lesson.videoUrl && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Video</p>
                <a
                  href={lesson.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 text-sm break-all hover:underline"
                >
                  {lesson.videoUrl}
                </a>
              </div>
            )}

            {lesson.content && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Content</p>
                <p className="text-white text-sm whitespace-pre-wrap">{lesson.content}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/60">
              <div>
                <p className="text-sm text-gray-400 mb-1">Duration</p>
                <p className="text-white font-semibold">
                  {lesson.duration ? `${lesson.duration} min` : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Order</p>
                <p className="text-white text-sm">{lesson.order ?? "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}