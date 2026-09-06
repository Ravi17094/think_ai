import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../../features/auth/authSlice';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import Branding from '../../components/auth/Branding';
import FeedbackHeader from '../../components/auth/FeedbackHeader';
import ErrorAlert from '../../components/auth/ErrorAlert';
import { getRegisterErrorMessage } from '../../utils/authErrors';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Learner');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(
      registerUser({ name, email, password, role })
    );
    if (registerUser.fulfilled.match(result)) {
      const roleHome = {
        Learner: '/learner',
        TA: '/ta',
        Instructor: '/instructor/dashboard',
      };
      navigate(roleHome[role] || '/learner');
    }
  };

  return (
    <div className="h-screen w-full grid md:grid-cols-2 bg-[#0B0F19] text-white relative overflow-hidden">
      <div className="ambient-glow animate-float top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20" />
      <div className="ambient-glow animate-float-delayed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/20" />
      <div className="absolute inset-0 bg-grid-masked pointer-events-none" />

      {/* Left Column: Software Learner Showcase / Slogan */}
      <div className="hidden md:flex flex-col justify-center px-12 lg:px-20 relative z-10 space-y-6 border-r border-white/10 bg-gradient-to-br from-indigo-950/20 via-transparent to-cyan-950/20">
        <div className="space-y-4 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Build your path in <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Software Engineering</span>.
          </h1>
          
          <p className="text-slate-400 text-base leading-relaxed">
            Master full-stack systems, clean architecture, and interactive coding environments designed for high-performance learners and backend builders.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1">
              <p className="font-mono text-cyan-400 text-sm font-bold">01 / Code</p>
              <p className="text-xs text-slate-300">Live multi-language compiler &amp; sandbox environments.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1">
              <p className="font-mono text-indigo-400 text-sm font-bold">02 / Scale</p>
              <p className="text-xs text-slate-300">Architect scalable systems with structured modules.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="flex h-full flex-col items-center justify-center p-6 relative z-10 overflow-y-auto">
        <div className="glass-panel w-full max-w-md p-8 lg:p-10 rounded-2xl relative mb-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          <Branding size="medium" />

          <ErrorAlert message={getRegisterErrorMessage(error)} />

          <FeedbackHeader
            title="Set up your credentials to start your journey.."
            align="left"
          />

          <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-4">
            <InputField
              label="Full Name"
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              required
            />
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
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
            <div className="space-y-1.5">
              <label htmlFor="role" className="block text-sm font-medium text-slate-200">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
              >
                <option value="Learner" className="text-slate-900">Learner</option>
                <option value="TA" className="text-slate-900">Teaching Assistant (TA)</option>
                <option value="Instructor" className="text-slate-900">Instructor</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={loading}
              label={loading ? 'Begin Sequence...' : 'Begin Registration'}
            />

            {/* Centered Footer Links */}
            <div className="flex flex-col items-center justify-center text-center space-y-2 pt-2">
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
                  Log in
                </Link>
              </p>
              <p className="text-sm text-gray-400">
                <Link to="/" className="text-[#C77DFF] font-semibold hover:text-[#A435F0] transition-colors">
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
