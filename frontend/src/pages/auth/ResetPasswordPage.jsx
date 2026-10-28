import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import Branding from '../../components/auth/Branding';
import { resetPassword } from '../../features/auth/authSlice';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await dispatch(resetPassword({ token, password }));
    setLoading(false);
    if (resetPassword.fulfilled.match(result)) {
      toast.success('Password reset successfully. Please log in.', { theme: "dark" });
      navigate('/login', { replace: true });
    } else {
      toast.error(result.payload || 'This reset link is invalid or has expired.', { theme: "dark" });
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0B0F19] text-white relative overflow-hidden">
      <div className="absolute rounded-full blur-3xl top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/25 pointer-events-none" />
      <div className="absolute rounded-full blur-3xl bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/20 pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 lg:p-10 rounded-2xl relative z-10">
        <Branding size="medium" />
        <h2 className="text-xl font-bold mt-4 mb-1">Set a new password</h2>
        <p className="text-sm text-slate-400 mb-6">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <InputField
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Abc@12345"
            />
            {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password}</p>}
          </div>
          <div>
            <InputField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Abc@12345"
            />
            {errors.confirmPassword && <p className="text-xs text-rose-400 mt-1">{errors.confirmPassword}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            label={loading ? 'Resetting...' : 'Reset Password'}
          />

          <div className="text-center pt-2">
            <Link to="/login" className="text-sm text-purple-400 hover:text-purple-600 transition-colors">
              ← Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
