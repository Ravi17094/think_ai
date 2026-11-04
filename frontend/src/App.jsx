import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import LandingPage from "./pages/public/Landingpage";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoutes from "./routes/AdminRoutes";

// Your LMS Routes
import InstructorRoutes from "./routes/InstructorRoutes";
import LearnerRoutes from "./routes/LearnerRoutes";
import TADashboard from "./pages/ta/TADashboard";

function RolePlaceholder({ label }) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0B0F19] text-white">
      <p className="text-lg">{label} dashboard — coming soon.</p>
    </div>
  );
}

function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] px-6 text-white flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold">Access not available</h1>
        <p className="mt-3 text-slate-300">
          Your account does not have access to this page. Sign in with an account that has the required role.
        </p>
        <Link className="mt-6 inline-flex rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500" to="/login">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/org-login"
        element={<RolePlaceholder label="Organization login" />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminRoutes />
          </ProtectedRoute>
        }
      />

      {/* Learner */}
      <Route
        path="/learner/*"
        element={
          <ProtectedRoute allowedRoles={["Learner"]}>
            <LearnerRoutes />
          </ProtectedRoute>
        }
      />

      {/* Instructor */}
      <Route
        path="/instructor/*"
        element={
          <ProtectedRoute allowedRoles={["Instructor"]}>
            <InstructorRoutes />
          </ProtectedRoute>
        }
      />

      {/* TA */}
      <Route
        path="/ta/*"
        element={
          <ProtectedRoute allowedRoles={["TA"]}>
            <TADashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
