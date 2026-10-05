import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetTokenInfo, setResetTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email);
      setSubmitted(true);
      if (res.data?.data?.resetToken) {
        setResetTokenInfo(res.data.data.resetToken);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to login</span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Reset Your Password</h2>
          <p className="text-xs text-slate-500 mt-1">Enter your account email to receive a secure token</p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Reset request initiated!</p>
                <p className="mt-1">In production, an encrypted reset link is sent via transactional email.</p>
              </div>
            </div>

            {resetTokenInfo && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 block">Development Reset Token:</span>
                <code className="block p-2 bg-slate-200 rounded text-[11px] break-all select-all">{resetTokenInfo}</code>
                <Link
                  to={`/reset-password?token=${resetTokenInfo}`}
                  className="inline-block mt-2 px-3 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-lg"
                >
                  Proceed to Reset Screen
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.ac.in"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-secondary"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-primary hover:bg-navy-800 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Password Reset Token'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
