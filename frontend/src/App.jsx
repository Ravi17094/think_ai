import React, { Suspense } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import LandingPage from "./pages/public/Landingpage";

import ProtectedRoute from "./routes/ProtectedRoute";
// Load role workspaces only after a user opens them. This keeps a fault in one
// role-specific page from preventing every other user from reaching login.
const AdminRoutes = React.lazy(() => import("./routes/AdminRoutes"));
const InstructorRoutes = React.lazy(() => import("./routes/InstructorRoutes"));
const LearnerRoutes = React.lazy(() => import("./routes/LearnerRoutes"));
const TADashboard = React.lazy(() => import("./pages/ta/TADashboard"));

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
            <Suspense fallback={<RolePlaceholder label="Loading Admin workspace" />}>
              <AdminRoutes />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Learner */}
      <Route
        path="/learner/*"
        element={
          <ProtectedRoute allowedRoles={["Learner"]}>
            <Suspense fallback={<RolePlaceholder label="Loading Learner workspace" />}>
              <LearnerRoutes />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Instructor */}
      <Route
        path="/instructor/*"
        element={
          <ProtectedRoute allowedRoles={["Instructor"]}>
            <Suspense fallback={<RolePlaceholder label="Loading Instructor workspace" />}>
              <InstructorRoutes />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* TA */}
      <Route
        path="/ta/*"
        element={
          <ProtectedRoute allowedRoles={["TA"]}>
            <Suspense fallback={<RolePlaceholder label="Loading TA workspace" />}>
              <TADashboard />
            </Suspense>
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
