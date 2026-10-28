import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import AdminLayout from "../layouts/AdminLayout";

// Admin pages
import AdminDashboardHome from "../pages/admin/AdminDashboardHome";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AdminProfilePage from "../pages/admin/AdminProfilePage";
import AdminEditProfilePage from "../pages/admin/AdminEditProfilePage";
import RBACMatrix from "../pages/admin/RBACMatrix";
import AnalyticsPage from "../pages/admin/AnalyticsPage";
import AuditLogPage from "../pages/admin/AuditLogPage";
import CertificateTemplatesPage from "../pages/admin/CertificateTemplatesPage";

// Certificates
import InstructorCertificates from "../pages/instructor_portal/InstructorCertificates";

// Courses
import CoursesPage from "../pages/courses/CoursesPage";
import CourseDetails from "../pages/courses/CourseDetails";
import EditCourse from "../pages/courses/EditCourse";

// Batches
import BatchList from "../pages/batches/BatchList";
import AddBatch from "../pages/batches/AddBatch";
import EditBatch from "../pages/batches/EditBatch";
import BatchDetails from "../pages/batches/BatchDetails";

// Enrollments
import EnrollmentList from "../pages/enrollments/EnrollmentList";
import AddEnrollment from "../pages/enrollments/AddEnrollment";
import EditEnrollment from "../pages/enrollments/EditEnrollment";
import EnrollmentDetails from "../pages/enrollments/EnrollmentDetails";

// Modules
import ModuleList from "../pages/modules/ModuleList";
import AddModule from "../pages/modules/AddModule";
import EditModule from "../pages/modules/EditModule";
import ModuleDetails from "../pages/modules/ModuleDetails";

// Lessons
import LessonList from "../pages/lessons/Lessonlist";
import AddLesson from "../pages/lessons/Addlesson";
import EditLesson from "../pages/lessons/Editlesson";
import LessonDetails from "../pages/lessons/Lessondetails";

// Assessments
import AssessmentManager from "../pages/AssessmentPage/Assessmentmanager";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        {/* ==================== DASHBOARD ==================== */}
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route
          path="dashboard"
          element={<AdminDashboardHome />}
        />

        {/* ==================== ADMIN ==================== */}
        <Route
          path="users"
          element={<AdminUsersPage />}
        />

        <Route
          path="profile"
          element={<AdminProfilePage />}
        />

        <Route
          path="profile/edit"
          element={<AdminEditProfilePage />}
        />

        <Route
          path="rbac"
          element={<RBACMatrix />}
        />

        <Route
          path="analytics"
          element={<AnalyticsPage />}
        />

        <Route
          path="audit-logs"
          element={<AuditLogPage />}
        />

        {/* ==================== CERTIFICATES ==================== */}
        <Route
          path="certificate-templates"
          element={<CertificateTemplatesPage />}
        />

        <Route
          path="certificates"
          element={<InstructorCertificates />}
        />

        {/* ==================== COURSES ==================== */}
        <Route
          path="courses"
          element={<CoursesPage />}
        />

        <Route
          path="courses/:id"
          element={<CourseDetails />}
        />

        <Route
          path="courses/:id/videos"
          element={<EditCourse />}
        />

        {/* ==================== BATCHES ==================== */}
        <Route
          path="batches"
          element={<BatchList />}
        />

        <Route
          path="batches/add"
          element={<AddBatch />}
        />

        <Route
          path="batches/edit/:id"
          element={<EditBatch />}
        />

        <Route
          path="batches/:id"
          element={<BatchDetails />}
        />

        {/* ==================== ENROLLMENTS ==================== */}
        <Route
          path="enrollments"
          element={<EnrollmentList />}
        />

        <Route
          path="enrollments/add"
          element={<AddEnrollment />}
        />

        <Route
          path="enrollments/edit/:id"
          element={<EditEnrollment />}
        />

        <Route
          path="enrollments/:id"
          element={<EnrollmentDetails />}
        />

        {/* ==================== MODULES ==================== */}
        <Route
          path="modules"
          element={<ModuleList />}
        />

        <Route
          path="modules/add"
          element={<AddModule />}
        />

        <Route
          path="modules/edit/:id"
          element={<EditModule />}
        />

        <Route
          path="modules/:id"
          element={<ModuleDetails />}
        />

        {/* ==================== LESSONS ==================== */}
        <Route
          path="lessons"
          element={<LessonList />}
        />

        <Route
          path="lessons/add"
          element={<AddLesson />}
        />

        <Route
          path="lessons/edit/:id"
          element={<EditLesson />}
        />

        <Route
          path="lessons/:id"
          element={<LessonDetails />}
        />

        {/* ==================== ASSESSMENTS ==================== */}
        <Route
          path="assessments"
          element={<AssessmentManager />}
        />

        <Route
          path="assessments/:courseId"
          element={<AssessmentManager />}
        />
      </Route>
    </Routes>
  );
}