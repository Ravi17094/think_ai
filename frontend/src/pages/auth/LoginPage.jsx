import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { loginUser, clearAuthError, selectUser } from '../../features/auth/authSlice';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import Checkbox from '../../components/common/Checkbox';
import Branding from '../../components/auth/Branding';
import FeedbackHeader from '../../components/auth/FeedbackHeader';
import ErrorAlert from '../../components/auth/Erroralert';
import { getLoginErrorMessage } from '../../utils/authErrors';

const ROLE_HOME = {
  Learner: '/learner',
  Instructor: '/instructor',
  TA: '/ta',
  Admin: '/admin',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepAlive, setKeepAlive] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const user = useSelector(selectUser);
  // ✅ Fixed: Destructured loading and error properly from state.auth
  const { loading, error } = useSelector((state) => state.auth);

  // Single source of truth for routing when user state changes
  useEffect(() => {
    if (user?.role) {
      const destination = ROLE_HOME[user.role] || '/learner';
      navigate(destination, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    console.log("📦 Full login result payload:", result);

    if (loginUser.fulfilled.match(result)) {
      const loggedInUser = result.payload.user;
      const destination = ROLE_HOME[loggedInUser?.role] || '/learner';
      console.log("🚀 Navigating directly to:", destination);
      navigate(destination, { replace: true });
    } else {
      console.error("❌ Login failed to fulfill:", result.payload);
    }
  };

  const sessionExpired = params.get('expired');

  return (
    <div className="h-screen w-full grid md:grid-cols-2 bg-[#0B0F19] text-white relative overflow-hidden">
      <div className="absolute rounded-full blur-3xl top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/25 pointer-events-none" />
      <div className="absolute rounded-full blur-3xl bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/20 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-masked pointer-events-none" />

      {/* Left Column: Software Learner Showcase / Slogan */}
      <div className="hidden md:flex flex-col justify-center px-12 lg:px-20 relative z-10 space-y-6 border-r border-white/10 bg-gradient-to-br from-indigo-950/20 via-transparent to-cyan-950/20">
        <div className="space-y-4 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Continue building your future in <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Software Engineering</span>.
          </h1>

          <p className="text-slate-400 text-base leading-relaxed">
            Pick up right where you left off. Dive into your course catalog, test code in the live sandbox, and level up your backend &amp; full-stack skills.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1">
              <p className="font-mono text-cyan-400 text-sm font-bold">01 / Resume</p>
              <p className="text-xs text-slate-300">Seamless tracking across all active modules.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1">
              <p className="font-mono text-indigo-400 text-sm font-bold">02 / Execute</p>
              <p className="text-xs text-slate-300">Instant validation through integrated compilers.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex h-full flex-col items-center justify-center p-6 relative z-10 overflow-y-auto">
        <div className="glass-panel w-full max-w-md p-8 lg:p-10 rounded-2xl relative mb-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          <Branding size="medium" />

          <ErrorAlert message={getLoginErrorMessage(error)} />

          <FeedbackHeader
            title="Login to continue your learning journey"
            description={sessionExpired ? 'Your session expired. Please sign in again.' : undefined}
            status={sessionExpired ? 'warning' : 'default'}
            align="left"
          />

          <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-4">
            <InputField
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              autoComplete="username"
              required
            />
            <InputField
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Abc@12345"
              autoComplete="current-password"
              required
            />

            <div className="flex justify-between items-center text-xs lg:text-sm pt-1 lg:pt-2">
              <Checkbox
                id="keep-alive"
                label="Keep connection alive"
                checked={keepAlive}
                onChange={(e) => setKeepAlive(e.target.checked)}
              />
              <Link to="/forgot-password" className="text-purple-400 hover:text-purple-600 transition-colors hover:drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]">
                Reset Password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              label={loading ? 'Authenticating...' : 'Continue'}
            />

            {/* Centered Footer Links */}
            <div className="flex flex-col items-center justify-center text-center space-y-2 pt-2">
              <p className="text-sm text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
                  Sign up
                </Link>
              </p>
              <p className="text-sm text-gray-400">
                <Link to="/" className="text-purple-400 font-semibold hover:text-purple-600 transition-colors">
                  ← Back to Home Page
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
