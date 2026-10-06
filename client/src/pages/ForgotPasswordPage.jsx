import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Send,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  // Multi-step: 'email' (Step 1) | 'otp_and_password' (Step 2) | 'success' (Step 3)
  const [step, setStep] = useState('email');

  // Step 1 State
  const [email, setEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');

  // Step 2 State
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Server feedback metadata
  const [serverOtp, setServerOtp] = useState(null);
  const [otpSentToEmail, setOtpSentToEmail] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      const data = res.data?.data;

      if (data?.otp) {
        setServerOtp(data.otp);
        // Pre-fill OTP automatically if provided by dev server
        setOtp(data.otp);
      }
      setOtpSentToEmail(Boolean(data?.otpSentToEmail));
      setStep('otp_and_password');
    } catch (err) {
      setRequestError(
        err.response?.data?.message ||
          err.message ||
          'Failed to send OTP. Please check your registered email address.'
      );
    } finally {
      setRequestLoading(false);
    }
  };

  // Step 2: Verify OTP & Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');

    if (!otp.trim()) {
      setResetError('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setResetLoading(true);

    try {
      const res = await authApi.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      if (res.data?.success) {
        const authToken = res.data?.data?.token;
        if (authToken) {
          localStorage.setItem('pr_auth_token', authToken);
        }
        setStep('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2200);
      }
    } catch (err) {
      setResetError(
        err.response?.data?.message ||
          err.message ||
          'Invalid OTP code or password reset failed. Please check your code.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full bg-white p-8 sm:p-9 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Top gradient highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"></div>

        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-brand-primary shadow-xs">
              <KeyRound className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {step === 'otp_and_password'
                  ? 'Verify OTP & Reset Password'
                  : step === 'success'
                  ? 'Password Reset Complete'
                  : 'Forgot Password'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'otp_and_password'
                  ? 'Enter your 6-digit code to set a new password'
                  : 'Instant 6-digit OTP recovery for accounts'}
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: Enter Email */}
        {step === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {requestError && (
              <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{requestError}</span>
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
                  placeholder="Enter your registered college email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                />
              </div>
            </div>


            <button
              type="submit"
              disabled={requestLoading || !email}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {requestLoading ? (
                <span>Generating Verification Code...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send 6-Digit Verification OTP</span>
                </>
              )}
            </button>

            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Remember your password?{' '}
                <Link to="/login" className="text-brand-secondary font-bold hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 'otp_and_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in duration-300">
            {/* Status Notification */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Verification OTP Generated for:</span>
              </div>
              <p className="font-semibold text-slate-700 pl-5.5">{email}</p>
            </div>

            {/* OTP Banner (Shows OTP directly if local/sandbox or prefilled) */}
            {serverOtp && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Your 6-Digit OTP Code:
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                    Ready
                  </span>
                </div>
                <div className="flex items-center justify-center py-2 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="font-mono text-2xl font-black tracking-[0.35em] text-emerald-800">
                    {serverOtp}
                  </span>
                </div>
                <p className="text-[10.5px] text-emerald-800/80 text-center">
                  Code auto-populated into the verification field below.
                </p>
              </div>
            )}

            {otpSentToEmail && !serverOtp && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                📬 The 6-digit code has been delivered to your email. Check your Inbox and <strong>Spam</strong> folder.
              </div>
            )}

            {resetError && (
              <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {/* OTP Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                6-Digit Verification OTP
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 583921"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono tracking-widest text-sm font-bold focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={resetLoading || otp.length < 6 || !newPassword || !confirmPassword}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {resetLoading ? (
                <span>Validating OTP &amp; Updating...</span>
              ) : (
                <>
                  <span>Verify OTP &amp; Save New Password</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setServerOtp(null);
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change Email</span>
              </button>

              <Link to="/login" className="text-brand-secondary font-bold hover:underline">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 'success' && (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-emerald-900 text-lg">
              Password Reset Successfully!
            </h3>
            <p className="text-xs text-emerald-800">
              Your new password is now active. You have been authenticated securely.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
              <span>Redirecting to your Dashboard...</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
