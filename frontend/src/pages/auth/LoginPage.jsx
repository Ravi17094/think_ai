import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { loginUser, clearAuthError, selectUser } from '../../features/auth/authSlice';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import Checkbox from '../../components/common/Checkbox';
import Branding from '../../components/auth/Branding';
import FeedbackHeader from '../../components/auth/FeedbackHeader';
import ErrorAlert from '../../components/auth/ErrorAlert';
import CodeTerminal from '../../components/auth/CodeTerminal';

const ROLE_HOME = {
  Learner: '/learner',
  Instructor: '/instructor',
  TA: '/ta',
  Admin: '/admin',
};

function toSystemError(message) {
  if (!message) return null;
  if (message.toLowerCase().includes('invalid')) {
    return `SYSTEM_AUTH_ERR_001: ${message} — neural sequence mismatch. Please re-authenticate.`;
  }
  return `SYSTEM_AUTH_ERR_000: ${message}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepAlive, setKeepAlive] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const user = useSelector(selectUser);
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) navigate(ROLE_HOME[user.role] || '/learner', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    return () => dispatch(clearAuthError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      navigate(ROLE_HOME[result.payload.user.role]);
    }
  };

  const sessionExpired = params.get('expired');

  return (
    <div className="h-screen w-full grid md:grid-cols-2 bg-[#1C1D1F] text-white relative overflow-hidden">
      <div className="absolute rounded-full blur-3xl top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#A435F0]/25 pointer-events-none" />
      <div className="absolute rounded-full blur-3xl bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#6D28D9]/20 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-masked pointer-events-none" />

      <div className="hidden md:flex h-full flex-col justify-center items-center p-8 relative z-10">
        <CodeTerminal />
      </div>

      <div className="flex h-full flex-col items-center justify-center p-6 relative z-10">
        <div className="glass-panel w-full max-w-md p-8 lg:p-10 rounded-2xl relative mb-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#A435F0]/50 to-transparent" />

          <Branding size="medium" />

          <ErrorAlert message={toSystemError(error)} />

          <FeedbackHeader
            title="Login to continue your learning journey"
            description={sessionExpired ? 'Your session expired. Please sign in again.' : undefined}
            status={sessionExpired ? 'warning' : 'default'}
            align="left"
          />

          <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
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
              <a href="#" className="text-[#C77DFF] hover:text-[#A435F0] transition-colors hover:drop-shadow-[0_0_8px_rgba(164,53,240,0.5)]">
                Reset Password?
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading}
              label={loading ? 'Authenticating...' : 'Continue'}
            />
          </form>
        </div>

        <div className="w-full max-w-md bg-[#232326] border border-[#3A3A3E] p-6 rounded-2xl text-center space-y-4">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#C77DFF] font-semibold hover:text-[#A435F0] transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        <p className="text-[11px] lg:text-xs text-center text-gray-500 mt-6 lg:mt-8">
          Encountering anomalies?{' '}
          <a href="#" className="text-gray-300 hover:text-white underline decoration-gray-600 underline-offset-4">
            Contact System Admin
          </a>
        </p>
      </div>
    </div>
  );
}
