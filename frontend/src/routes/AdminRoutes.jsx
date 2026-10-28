import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import AdminDashboardHome from "../pages/admin/AdminDashboardHome";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import CoursesPage from "../pages/courses/CoursesPage";
import CourseDetails from "../pages/courses/CourseDetails";
import AdminProfilePage from "../pages/admin/AdminProfilePage";
import AdminEditProfilePage from "../pages/admin/AdminEditProfilePage";

import BatchList from "../pages/batches/BatchList";
import AddBatch from "../pages/batches/AddBatch";
import EditBatch from "../pages/batches/EditBatch";
import BatchDetails from "../pages/batches/BatchDetails";
import CoursePlayer from "../pages/learner/CoursePlayer";

import AddEnrollment from "../pages/enrollments/AddEnrollment";
import EnrollmentDetails from "../pages/enrollments/EnrollmentDetails";
import EnrollmentList from "../pages/enrollments/EnrollmentList";
import EditEnrollment from "../pages/enrollments/EditEnrollment";

import ModuleList from '../pages/modules/ModuleList';
import AddModule from '../pages/modules/AddModule';
import EditModule from '../pages/modules/EditModule';
import ModuleDetails from '../pages/modules/ModuleDetails';

import LessonList from '../pages/lessons/LessonList';
import AddLesson from '../pages/lessons/AddLesson';
import EditLesson from '../pages/lessons/EditLesson';
import LessonDetails from '../pages/lessons/LessonDetails';
import RBACMatrix from "../pages/admin/RBACMatrix";
import AuditLogPage from "../pages/admin/AuditLogPage";

// Assessment Management (create/update/view/delete assessments, per-module)
import AssessmentManager from "../pages/AssessmentPage/Assessmentmanager";

// Import Instructor Certificates Portal Page
import InstructorCertificates from "../pages/instructor_portal/InstructorCertificates";

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardHome />} />
        <Route path="users" element={<AdminUsersPage />} />

        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="profile/edit" element={<AdminEditProfilePage />} />
        <Route path="rbac" element={<RBACMatrix />} />
        <Route path="audit-logs" element={<AuditLogPage />} />

        {/* Instructor Student Certificates & Progress Tracker */}
        <Route path="certificates" element={<InstructorCertificates />} />

        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetails />} />
        <Route path="courses/:id/videos" element={<CoursePlayer />} />

        <Route path="batches" element={<BatchList />} />
        <Route path="batches/add" element={<AddBatch />} />
        <Route path="batches/edit/:id" element={<EditBatch />} />
        <Route path="batches/:id" element={<BatchDetails />} />

        <Route path="enrollments" element={<EnrollmentList />} />
        <Route path="enrollments/add" element={<AddEnrollment />} />
        <Route path="enrollments/edit/:id" element={<EditEnrollment />} />
        <Route path="enrollments/:id" element={<EnrollmentDetails />} />

        <Route path="modules" element={<ModuleList />} />
        <Route path="modules/add" element={<AddModule />} />
        <Route path="modules/edit/:id" element={<EditModule />} />
        <Route path="modules/:id" element={<ModuleDetails />} />

        <Route path="lessons" element={<LessonList />} />
        <Route path="lessons/add" element={<AddLesson />} />
        <Route path="lessons/edit/:id" element={<EditLesson />} />
        <Route path="lessons/:id" element={<LessonDetails />} />

        {/* Assessments — module-scoped create/edit/view/delete + submission analytics */}
        <Route path="assessments" element={<AssessmentManager />} />
        <Route path="assessments/:courseId" element={<AssessmentManager />} />
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
