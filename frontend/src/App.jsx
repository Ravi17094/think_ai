import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Routes, Route, Navigate } from "react-router-dom";

import { ThemeProvider } from "./components/ThemeContext";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import LandingPage from "./pages/public/Landingpage";

import ProtectedRoute from "./routes/ProtectedRoute";
import LearnerRoutes from "./routes/LearnerRoutes";
import AdminRoutes from "./routes/AdminRoutes";
import InstructorRoutes from "./routes/InstructorRoutes";
import ForumModuleRoutes from "./routes/ForumModuleRoutes";

import { fetchCurrentUser } from "./features/auth/authSlice";
import useSessionTimeout from "./hooks/useSessionTimeout";

import LiveClassStudio from "./pages/liveStudio/LiveClassStudio";

function RolePlaceholder({ label }) {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
      <h1 className="text-2xl">
        {label} dashboard — coming soon.
      </h1>
    </div>
  );
}

function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Automatically check token expiry state
  useSessionTimeout();

  // Fetch current user when a token exists
  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token]);

  return (
    <ThemeProvider>
      <Routes>
        {/* =========================
            PUBLIC ROUTES
        ========================= */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/home"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/reset-password/:token"
          element={<ResetPasswordPage />}
        />

        {/* =========================
            FORUM MODULE
        ========================= */}

        <Route
          path="/forum/*"
          element={<ForumModuleRoutes />}
        />

        {/* =========================
            ORGANIZATION LOGIN
        ========================= */}

        <Route
          path="/org-login"
          element={
            <RolePlaceholder label="Organization Login" />
          }
        />

        {/* =========================
            ADMIN
        ========================= */}

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminRoutes />
            </ProtectedRoute>
          }
        />

        {/* =========================
            LEARNER
        ========================= */}

        <Route
          path="/learner/*"
          element={
            <ProtectedRoute
              allowedRoles={["Learner", "Admin"]}
            >
              <LearnerRoutes />
            </ProtectedRoute>
          }
        />

        {/* =========================
            INSTRUCTOR
        ========================= */}

        <Route
          path="/instructor/*"
          element={
            <ProtectedRoute
              allowedRoles={["Instructor", "Admin"]}
            >
              <InstructorRoutes />
            </ProtectedRoute>
          }
        />

        {/* =========================
            TA
        ========================= */}

        <Route
          path="/ta/*"
          element={
            <ProtectedRoute
              allowedRoles={["TA", "Admin"]}
            >
              <RolePlaceholder label="TA" />
            </ProtectedRoute>
          }
        />

        {/* =========================
            LIVE CLASS STUDIO
        ========================= */}

        <Route
          path="/live-studio/:sessionId?"
          element={
            <ProtectedRoute
              allowedRoles={["Instructor", "Admin", "Learner"]}
            >
              <LiveClassStudio />
            </ProtectedRoute>
          }
        />

        {/* =========================
            404
        ========================= */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </ThemeProvider>
  );
}

export default App;