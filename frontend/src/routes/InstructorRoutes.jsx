import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import InstructorLayout from "../layouts/InstructorLayout";
import InstructorDashboard from "../pages/instructor_portal/InstructorDashboard";

import AssessmentManager from "../pages/instructor_portal/AssessmentManager";
import ModuleManager from '../pages/instructor_portal/ModuleManager';
import InstructorVideoPreview from "../pages/instructor_portal/InstructorVideoPreview";
import StudentSubmissionsHub from "../pages/instructor_portal/StudentSubmissionsHub";
import StudentSubmissions from "../pages/instructor_portal/StudentSubmissions";
import InstructorCertificates from "../pages/instructor_portal/InstructorCertificates";

function InstructorRoutes() {
  return (
    <Routes>
      <Route path="/" element={<InstructorLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Instructor Dashboards & Courses */}
        <Route path="dashboard" element={<InstructorDashboard />} />
        <Route path="modules" element={<ModuleManager />} />
        <Route path="assignments" element={<AssessmentManager />} />
        <Route path="assignments/create" element={<AssessmentManager />} />
        
        {/* Student Submissions Hub & Individual Report Page */}
        <Route path="student-submissions" element={<StudentSubmissionsHub />} />
        <Route path="courses/:courseId/students/:enrollmentId/submissions" element={<StudentSubmissions />} />
        <Route path="certificates" element={<InstructorCertificates />} />
        
        <Route path="courses/:courseId/videos/:lessonId" element={<InstructorVideoPreview />} />
      </Route>
    </Routes>
  );
}

export default InstructorRoutes;
