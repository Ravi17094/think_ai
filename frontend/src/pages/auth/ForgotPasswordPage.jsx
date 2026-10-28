import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import Branding from '../../components/auth/Branding';
import { forgotPassword } from '../../features/auth/authSlice';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    const result = await dispatch(forgotPassword(email));
    setLoading(false);
    if (forgotPassword.fulfilled.match(result)) {
      setSent(true);
    } else {
      toast.error(result.payload || 'Something went wrong', { theme: "dark" });
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0B0F19] text-white relative overflow-hidden">
      <div className="absolute rounded-full blur-3xl top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/25 pointer-events-none" />
      <div className="absolute rounded-full blur-3xl bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/20 pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 lg:p-10 rounded-2xl relative z-10">
        <Branding size="medium" />

        {sent ? (
          <div className="text-center space-y-4 mt-4">
            <h2 className="text-xl font-bold">Check your email</h2>
            <p className="text-sm text-slate-400">
              If an account exists for {email}, a password reset link has been sent. It expires in 1 hour.
            </p>
            <Link to="/login" className="inline-block text-cyan-400 font-semibold hover:text-cyan-300 transition-colors text-sm">
              ← Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mt-4 mb-1">Forgot your password?</h2>
            <p className="text-sm text-slate-400 mb-6">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <InputField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                />
                {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                label={loading ? 'Sending...' : 'Send Reset Link'}
              />

              <div className="text-center pt-2">
            <Link to="/login" className="text-sm text-purple-400 hover:text-purple-600 transition-colors">
                  ← Back to login
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
