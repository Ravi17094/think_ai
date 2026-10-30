import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import CourseModal from '../../components/admin/CourseModal';
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  selectCourses,
  selectCoursesLoading,
  selectCoursesError,
} from '../../features/courses/courseSlice';

const STATUS_STYLES = {
  ACTIVE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
};
const DEFAULT_STATUS_STYLE = 'bg-gray-500/10 text-gray-400 border-gray-600/30';

export default function AdminCoursesPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const dispatch = useDispatch();
  const courses = useSelector(selectCourses);
  const loading = useSelector(selectCoursesLoading);
  const error = useSelector(selectCoursesError);

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) =>
      c.title?.toLowerCase().includes(search.toLowerCase())
    );
  }, [courses, search]);

  const handleOpenModal = (course = null) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (courseData) => {
    if (courseData.id) {
      await dispatch(updateCourse({ id: courseData.id, updates: courseData }));
    } else {
      await dispatch(createCourse(courseData));
    }
    setIsModalOpen(false);
  };

  const handleDeleteCourse = (id) => {
    dispatch(deleteCourse(id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-gray-400 mt-1">Manage all courses on the platform.</p>
        </div>
        <Button label="+ New Course" onClick={() => handleOpenModal()} />
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="max-w-sm">
          <InputField
            label="Search"
            id="course-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses"
          />
        </div>

        {loading && <LoadingSpinner label="Loading courses..." />}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => dispatch(fetchCourses())} />
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((c) => (
              <div key={c.id} className="glass-panel rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-100">{c.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] border whitespace-nowrap ${
                      STATUS_STYLES[c.status] || DEFAULT_STATUS_STYLE
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">by {c.instructor}</p>
                <p className="text-sm text-gray-400 line-clamp-2">{c.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                  <span>{c.category}</span>
                  <span>{c.level}</span>
                  <span>{c.duration}</span>
                </div>
                <p className="text-sm font-medium text-gray-200 mt-1">
                  {typeof c.price === 'number' ? `\u20b9${c.price}` : c.price}
                </p>
                <div className="flex gap-3 mt-2 text-xs">
                  <button
                    onClick={() => handleOpenModal(c)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(c.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredCourses.length === 0 && (
              <p className="text-gray-600 text-sm col-span-full text-center py-8">
                No courses match your search.
              </p>
            )}
          </div>
        )}
      </div>

      <CourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        course={selectedCourse}
        onSave={handleSaveCourse}
      />
    </div>
  );
}
