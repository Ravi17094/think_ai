import React from "react";
import { Routes, Route } from "react-router-dom";

import LearnerLayout from "../layouts/LearnerLayout";
import LearnerDashboard from "../pages/learner/LearnerDashboard";
import CoursePlayer from "../pages/learner/CoursePlayer";
import LearnerCoursesPage from "../pages/learner/LearnerCoursesPage";
import CourseDetails from '../pages/courses/CourseDetails';
import CodePlayground from "../pages/learner/CodePlayground/Codeplayground";
import AssessmentSubmissionPage from "../pages/learner/assessment/AssessmentSubmissionPage";
import LiveClassJoinPage from "../pages/learner/live-class/LiveClassJoinPage";
import LiveClassesListPage from "../pages/learner/live-class/LiveClassesListPage";
import AssignmentsPage from "../pages/learner/assessment/AssignmentsPage";
import CertificatesPage from "../pages/learner/CertificatesPage";
import CheckoutPage from "../pages/checkout/CheckoutPage";
import NotificationPreferencesPage from "../pages/settings/NotificationsPreferencesPage";

function LearnerRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LearnerLayout />}>
        <Route index element={<LearnerDashboard />} />
        <Route path="courses" element={<LearnerCoursesPage />} />
        <Route path="courses/:id/videos" element={<CoursePlayer />} />
        <Route path="courses/:id/courseDetails" element={<CourseDetails />} />
        <Route path="courses/:courseId/checkout" element={<CheckoutPage />} />
        <Route path="playground" element={<CodePlayground />} />
        <Route path="assessments/:assessmentId" element={<AssessmentSubmissionPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="live" element={<LiveClassesListPage />} />
        <Route path="live/:classId" element={<LiveClassJoinPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="settings/notifications" element={<NotificationPreferencesPage />} /> 
      </Route>
      
      <Route path="*" element={<div className="p-6 text-sm text-neutral-400">Page not found.</div>} />
    </Routes>
  );
}

export default LearnerRoutes;