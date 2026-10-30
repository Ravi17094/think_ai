import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getAllLessons, deleteLesson } from "../../api/lessonApi";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function LessonList() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [confirmState, setConfirmState] = useState({ open: false, lessonId: null });

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await getAllLessons();
      const data = response.data.data || [];
      // Sort lessons strictly by ID in ascending order
      data.sort((a, b) => a.id - b.id);
      setLessons(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      return (
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.module?.title?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [lessons, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredLessons.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentLessons = filteredLessons.slice(indexOfFirstItem, indexOfLastItem);

  const handleDeleteConfirmed = async () => {
    try {
      await deleteLesson(confirmState.lessonId);
      toast.success("Lesson deleted successfully");
      fetchLessons();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to delete lesson");
    } finally {
      setConfirmState({ open: false, lessonId: null });
    }
  };

  return (
    <div className="relative flex flex-col h-full space-y-4 sm:space-y-6 -mt-2 overflow-hidden pb-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Lesson Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage all lessons across modules.</p>
        </div>
        <div className="shadow-[0_0_20px_rgba(168,85,247,0.3)] rounded-xl">
          <Link
            to="/admin/lessons/add"
            className="px-6 py-2 text-sm font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white border-0 rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 inline-block"
          >
            + Add Lesson
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col glass-panel rounded-2xl p-4 sm:p-6 space-y-4 min-h-0 bg-[#1A1F2B] border border-gray-800">
        {/* Search Filter */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end shrink-0">
          <div className="max-w-sm w-full shrink-0 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lesson / module title..."
              className="w-full bg-black/20 border border-purple-500/30 text-purple-100 placeholder-purple-300/30 focus:border-purple-400 focus:ring-purple-400/50 rounded-lg px-10 py-2 text-sm outline-none transition-all shadow-inner"
            />
            <svg className="absolute right-3 top-2.5 h-4 w-4 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto min-h-0 border border-gray-800/60 rounded-xl custom-scrollbar relative">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#151025] z-10 shadow-md">
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                <th className="p-4 font-medium uppercase tracking-wider">ID</th>
                <th className="p-4 font-medium uppercase tracking-wider">Title</th>
                <th className="p-4 font-medium uppercase tracking-wider">Module</th>
                <th className="p-4 font-medium uppercase tracking-wider">Order</th>
                <th className="p-4 font-medium uppercase tracking-wider">Duration</th>
                <th className="p-4 font-medium uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-cyan-400 text-sm animate-pulse">
                    Loading lessons...
                  </td>
                </tr>
              )}

              {!loading &&
                currentLessons.map((lesson) => (
                  <tr key={lesson.id} className="border-b border-slate-800/60 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-gray-300 font-medium">{lesson.id}</td>
                    <td className="p-4 text-gray-200 font-medium">{lesson.title}</td>
                    <td className="p-4 text-gray-300">{lesson.module?.title || "-"}</td>
                    <td className="p-4 text-gray-300">{lesson.order ?? "-"}</td>
                    <td className="p-4 text-gray-300">
                      {lesson.duration ? `${lesson.duration} min` : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Icon Button */}
                        <Link
                          to={`/admin/lessons/${lesson.id}`}
                          title="View"
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all inline-flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        </Link>
                        {/* Edit Icon Button */}
                        <Link
                          to={`/admin/lessons/edit/${lesson.id}`}
                          title="Edit"
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all inline-flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </Link>
                        {/* Delete Icon Button */}
                        <button
                          onClick={() => setConfirmState({ open: true, lessonId: lesson.id })}
                          title="Delete"
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all inline-flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && filteredLessons.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                    <p className="text-sm tracking-widest uppercase mt-4">No lessons match your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4 mt-2 pt-4 border-t border-gray-800/60">
            <span className="text-xs text-gray-500 font-medium tracking-wide">
              Showing <strong className="text-gray-300">{indexOfFirstItem + 1}</strong> to{" "}
              <strong className="text-gray-300">{Math.min(indexOfLastItem, filteredLessons.length)}</strong> of{" "}
              <strong className="text-gray-300">{filteredLessons.length}</strong> lessons
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white/[0.02] border border-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05] hover:border-gray-500 transition-all text-xs font-bold uppercase tracking-wider"
              >
                Prev
              </button>
              <div className="flex items-center px-4 py-2 rounded-lg bg-black/20 border border-gray-800 text-xs font-bold text-gray-400">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white/[0.02] border border-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05] hover:border-gray-500 transition-all text-xs font-bold uppercase tracking-wider"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="Confirm Delete"
        message="Are you sure you want to delete this lesson? This action cannot be undone."
        danger={true}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmState({ open: false, lessonId: null })}
      />
    </div>
  );
}