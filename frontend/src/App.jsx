import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import LandingPage from "./pages/public/Landingpage";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoutes from "./routes/AdminRoutes";

// Your LMS Routes
import AppRoutes from "./routes/AppRoutes";

function RolePlaceholder({ label }) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0B0F19] text-white">
      <p className="text-lg">{label} dashboard — coming soon.</p>
    </div>
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
            <>
              <AdminRoutes />
              <AppRoutes />
            </>
          </ProtectedRoute>
        }
      />

      {/* Learner */}
      <Route
        path="/learner/*"
        element={
          <ProtectedRoute allowedRoles={["Learner"]}>
            <RolePlaceholder label="Learner" />
          </ProtectedRoute>
        }
      />

      {/* Instructor */}
      <Route
        path="/instructor/*"
        element={
          <ProtectedRoute allowedRoles={["Instructor"]}>
            <RolePlaceholder label="Instructor" />
          </ProtectedRoute>
        }
      />

      {/* TA */}
      <Route
        path="/ta/*"
        element={
          <ProtectedRoute allowedRoles={["Ta"]}>
            <RolePlaceholder label="TA" />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;