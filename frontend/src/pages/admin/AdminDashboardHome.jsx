import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import KPICard from '../../components/admin/KPICard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { fetchCourses, selectCourses, selectCoursesLoading } from '../../features/courses/courseSlice';

export default function AdminDashboardHome() {
  const dispatch = useDispatch();
  const courses = useSelector(selectCourses) ?? [];
  const coursesLoading = useSelector(selectCoursesLoading);

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  const addedThisMonth = courses.filter((c) => {
    if (!c.createdAt) return false;
    const created = new Date(c.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const kpis = [
    {
      label: 'Total Courses',
      value: coursesLoading ? '\u2026' : String(courses.length),
      change: coursesLoading ? '' : `${addedThisMonth} added this month`,
      positive: true,
    },
    { label: 'Revenue (MTD)', value: '\u2014', change: 'Awaiting backend endpoint', positive: false },
    { label: 'Active Learners', value: '\u2014', change: 'Awaiting backend endpoint', positive: false },
    { label: 'Pending Approvals', value: '\u2014', change: 'Awaiting backend endpoint', positive: false },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Platform overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Enrollment Trend</h2>
          <div className="h-56 flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl">
            No enrollment-trend endpoint yet
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Recent Activity</h2>
          <div className="h-40 flex items-center justify-center text-gray-600 text-sm text-center border border-dashed border-gray-800 rounded-xl px-4">
            No activity-feed endpoint yet
          </div>
        </div>
      </div>
    </div>
  );
}
