import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await authApi.resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
          <p className="text-xs text-slate-500 mt-1">Provide your reset token and new secure password</p>
        </div>

        {success ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p>Password updated successfully! Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter reset token from email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-primary hover:bg-navy-800 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
