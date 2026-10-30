import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboardHome from '../pages/admin/AdminDashboardHome';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminCoursesPage from '../pages/admin/AdminCoursesPage';
import AdminProfilePage from '../pages/admin/AdminProfilePage';
import AdminEditProfilePage from '../pages/admin/AdminEditProfilePage';
import AdminBatchesPage from '../pages/admin/AdminBatchesPage';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardHome />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="profile/edit" element={<AdminEditProfilePage />} />
        <Route path="batches" element={<AdminBatchesPage />} />
      </Route>
    </Routes>
  );
}