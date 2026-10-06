import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Send,
  ExternalLink,
  RefreshCw,
  Info,
} from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setSubmitted(true);
      setResultData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to dispatch reset request.');
    } finally {
      setLoading(false);
    }
  };

  const userExists = resultData?.userExists ?? true;
  const resetTokenInfo = resultData?.resetToken;
  const isSmtpConfigured = resultData?.smtpConfigured ?? false;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full bg-white p-8 sm:p-9 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle top decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"></div>

        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-brand-primary shadow-xs">
              <KeyRound className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Forgot Password</h2>
              <p className="text-xs text-slate-500">Transactional recovery for student & admin accounts</p>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {userExists === false ? (
              /* Case 1: The email was not found in database */
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900 text-sm">No Registered Account Found</p>
                    <p className="text-amber-800 leading-relaxed">
                      We could not locate an account associated with <strong className="font-semibold text-amber-950">{email}</strong>.
                    </p>
                    <p className="text-[11px] text-amber-700/90 pt-1">
                      💡 <strong>Note:</strong> Student accounts must use official college emails (e.g., <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">24051174@kiit.ac.in</code>). Personal Gmail accounts are only used for Lead Verifier access.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setResultData(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-brand-primary text-white hover:bg-navy-800 text-xs font-bold transition shadow-sm"
                  >
                    Try Registered College Email
                  </button>
                  <Link
                    to="/join-us"
                    className="w-full py-2 text-center text-xs text-brand-secondary font-bold hover:underline"
                  >
                    Need to Register? Join as a Student
                  </Link>
                </div>
              </div>
            ) : (
              /* Case 2: Account exists */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-900 text-sm">Reset Request Processed!</p>
                    <p className="text-emerald-800 leading-relaxed">
                      A single-use password reset link was dispatched for <strong className="font-semibold text-emerald-950">{email}</strong>.
                    </p>
                    {isSmtpConfigured ? (
                      <p className="text-[11px] text-emerald-700/90 pt-1">
                        📬 Delivered via SMTP. Please check your inbox and <strong>Spam/Junk</strong> folder.
                      </p>
                    ) : (
                      <p className="text-[11px] text-blue-700/90 pt-1">
                        ⚙️ <strong>Local Development Notice:</strong> SMTP credentials are not yet configured in <code className="bg-blue-100 text-blue-900 px-1 rounded font-mono font-semibold">server/.env</code>. The reset token has been printed directly below so you can test right now:
                      </p>
                    )}
                  </div>
                </div>

                {/* Development token shortcut when running locally */}
                {resetTokenInfo && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-brand-secondary" />
                        Immediate Reset Link:
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-200/70 px-2 py-0.5 rounded-full">
                        Active Token
                      </span>
                    </div>
                    <code className="block p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-[11px] font-mono break-all select-all text-slate-700">
                      {resetTokenInfo}
                    </code>
                    <Link
                      to={`/reset-password?token=${resetTokenInfo}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      <span>Open Reset Password Screen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setResultData(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Another Email Address</span>
                  </button>

                  <Link
                    to="/login"
                    className="w-full py-2.5 text-center text-xs text-brand-secondary font-bold hover:underline"
                  >
                    Return to Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Registered Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.ac.in or verifier email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your official college email used at registration (e.g. <code>24051174@kiit.ac.in</code>).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Checking &amp; Dispatching Token...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>

            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Remembered your password?{' '}
                <Link to="/login" className="text-brand-secondary font-bold hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
