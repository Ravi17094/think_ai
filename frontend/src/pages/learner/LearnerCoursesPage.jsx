import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CourseList from '../../pages/courses/CourseList';
import {
  fetchCourses,
  selectCourses,
  selectCoursesLoading,
  selectCoursesError,
} from '../../features/courses/courseSlice';

export default function LearnerCoursesPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

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

  const handleViewCourse = (course) => {
    const courseId = course.id || course._id;
    navigate(`/learner/courses/${courseId}/courseDetails`);
  };

  const hasNextPage = currentCourses.length === ITEMS_PER_PAGE;

  return (
 <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="shrink-0">
        {/* Switches between white text in dark mode and black text in light mode */}
       <h1 className="text-2xl font-semibold dark:text-purple-400">All Courses</h1>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <CourseList
          courses={currentCourses}
          loading={loading}
          error={error}
          search={search}
          setSearch={setSearch}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          hasNextPage={hasNextPage}
          onView={handleViewCourse}
          onRetry={() => dispatch(fetchCourses({ page: currentPage, limit: ITEMS_PER_PAGE, search: debouncedSearch }))}
        />
      </div>
    </div>
  );
}