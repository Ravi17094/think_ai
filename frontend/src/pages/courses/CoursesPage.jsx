import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import CourseList from './CourseList';
import AddModal from './AddCourse';
import { useNavigate } from 'react-router-dom';
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  selectCourses,
  selectCoursesLoading,
  selectCoursesError,
} from '../../features/courses/courseSlice';

export default function CoursesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const handleViewCourse = (course) => {
    navigate(`/admin/courses/${course.id || course._id}`);
  };

  const dispatch = useDispatch();
  const rawCourses = useSelector(selectCourses);
  const loading = useSelector(selectCoursesLoading);
  const error = useSelector(selectCoursesError);

  const currentCourses = useMemo(() => {
    if (Array.isArray(rawCourses)) return rawCourses;
    if (rawCourses && Array.isArray(rawCourses.courses)) return rawCourses.courses;
    return [];
  }, [rawCourses]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    dispatch(fetchCourses({ page: currentPage, limit: ITEMS_PER_PAGE, search: debouncedSearch }));
  }, [dispatch, currentPage, debouncedSearch]);

  const handleOpenModal = (course = null) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (courseData) => {
    const isEdit = Boolean(courseData.id);
    const {
      level,
      language,
      createdAt,
      updatedAt,
      id,
      thumbnailFile,
      videoFile,
      videoUrl,
      ...cleanData
    } = courseData;

    if (cleanData.price !== undefined && cleanData.price !== null) {
      cleanData.price = parseFloat(cleanData.price);
    }

    const thunk = isEdit
      ? updateCourse({ id: courseData.id, updates: cleanData })
      : createCourse(cleanData);

    const result = await dispatch(thunk);

    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(isEdit ? 'Course updated successfully' : 'Course created successfully', { theme: "dark" });
      setIsModalOpen(false);
      dispatch(fetchCourses({ page: currentPage, limit: ITEMS_PER_PAGE, search: debouncedSearch }));
    } else {
      toast.error(result.payload || (isEdit ? 'Failed to update course' : 'Failed to create course'), { theme: "dark" });
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    const result = await dispatch(deleteCourse(id));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Course deleted', { theme: "dark" });
      dispatch(fetchCourses({ page: currentPage, limit: ITEMS_PER_PAGE, search: debouncedSearch }));

      if (currentCourses.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } else {
      toast.error(result.payload || 'Failed to delete course', { theme: "dark" });
    }
  };

  const hasNextPage = currentCourses.length === ITEMS_PER_PAGE;

  return (
    <div className="relative flex flex-col h-auto md:h-full min-h-full overflow-y-auto md:overflow-hidden px-4 sm:px-6 py-2 -mt-2 space-y-4 bg-gradient-to-br from-[#0c0914] via-[#151025] to-[#1a1438] rounded-3xl border border-purple-500/10 shadow-2xl">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 flex flex-row items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-fuchsia-400 tracking-wide">
          Courses
        </h1>
        <div className="shadow-[0_0_20px_rgba(168,85,247,0.3)] rounded-xl">
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-2 text-sm font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white border-0 rounded-xl transition-all duration-300 shadow-lg"
          >
            + New Course
          </button>
        </div>
      </div>

      {/* Extracted Course List Component */}
      <CourseList
        courses={currentCourses}
        loading={loading}
        error={error}
        search={search}
        setSearch={setSearch}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        hasNextPage={hasNextPage}
        onEdit={handleOpenModal}
        onDelete={handleDeleteCourse}
        onView={handleViewCourse}
        onRetry={() => dispatch(fetchCourses({ page: currentPage, limit: ITEMS_PER_PAGE, search: debouncedSearch }))}
      />

      {/* Extracted Course Details Modal (Add/Edit) */}
      <AddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        course={selectedCourse}
        onSave={handleSaveCourse}
      />
    </div>
  );
}