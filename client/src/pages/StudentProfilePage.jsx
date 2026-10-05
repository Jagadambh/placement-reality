import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentProfilePage = () => {
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    pseudonym: user?.pseudonym || '',
    graduationYear: user?.graduationYear || 2024,
    privacyConsent: user?.privacyConsent !== false,
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Proof upload state
  const fileInputRef = useRef(null);
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofSuccess, setProofSuccess] = useState('');
  const [proofError, setProofError] = useState('');

  // Always refresh latest user data from server on page mount
  useEffect(() => {
    const fetchLatestUser = async () => {
      try {
        const res = await authApi.getMe();
        if (res.data?.success && res.data.data?.user) {
          const freshUser = res.data.data.user;
          updateUser(freshUser);
          setFormData({
            name: freshUser.name || '',
            pseudonym: freshUser.pseudonym || '',
            graduationYear: freshUser.graduationYear || 2024,
            privacyConsent: freshUser.privacyConsent !== false,
          });
        }
      } catch (err) {
        console.warn('[Profile] Could not fetch latest profile on mount:', err);
      }
    };
    fetchLatestUser();
  }, []);

  const handleUploadProof = async (e) => {
    e.preventDefault();
    setProofError('');
    setProofSuccess('');

    if (!proofFile) {
      setProofError('Please choose a valid College ID card, bonafide certificate, or admission letter before submitting.');
      return;
    }

    setUploadingProof(true);
    console.log('[ID Verification UI] Submitting proof document:', {
      name: proofFile.name,
      size: proofFile.size,
      type: proofFile.type,
    });

    try {
      const data = new FormData();
      data.append('idProofDocument', proofFile);

      const res = await authApi.submitIdProof(data);
      console.log('[ID Verification UI] Upload successful:', res.data);

      if (res.data?.success) {
        updateUser(res.data.data.user);
        setProofSuccess(res.data.message || 'Student ID proof submitted! Status is now Under Review.');
        setProofFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      console.error('[ID Verification UI Error] Upload failed:', err);
      setProofError(err.message || 'Failed to upload verification document.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await authApi.updateProfile(formData);
      if (res.data?.success) {
        updateUser(res.data.data.user);
        setSuccess('Profile and privacy settings updated successfully.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-navy-950">Student Profile & Privacy</h1>
        <p className="text-xs text-slate-500">
          Manage your account credentials, public pseudonyms, and Indian DPDP data preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Verification Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg">
            {user?.name?.[0] || 'U'}
          </div>

          <div>
            <h3 className="font-bold text-base text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 uppercase font-semibold">
              Role: {user?.role}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
            <span className="font-semibold text-slate-700 block">Verification Status:</span>
            {user?.isCollegeVerified ? (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Student of {user?.collegeId?.name || 'Selected Institute'}</span>
              </div>
            ) : user?.collegeVerificationStatus === 'pending' ? (
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-800 text-[11px] flex items-start gap-2">
                <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-purple-900">Verification Under Review</strong>
                  <span>Your student ID proof is submitted. A community moderator will review and validate your college affiliation.</span>
                </div>
              </div>
            ) : user?.collegeVerificationStatus === 'rejected' ? (
              <div className="space-y-3">
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-[11px] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Verification Request Rejected</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    <strong>Reason:</strong> {user?.collegeVerificationRejectionReason || user?.collegeVerificationDocument?.reviewNotes || 'The uploaded document did not meet institutional validation standards.'}
                  </p>
                  <p className="text-[10px] text-rose-600">
                    Please upload a clearer copy of your official College ID card, bonafide certificate, or admission letter below to re-apply.
                  </p>
                </div>

                {/* Upload ID Proof Form for Re-submission */}
                <form onSubmit={handleUploadProof} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Re-upload Student ID / Bonafide Proof:
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      setProofFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                      setProofError('');
                    }}
                    className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                  />

                  {proofFile && (
                    <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-200 text-[10px] text-purple-900 flex items-center justify-between">
                      <span className="truncate max-w-[170px] font-medium">{proofFile.name}</span>
                      <span className="text-slate-500 font-mono">{(proofFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}

                  {proofError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{proofError}</span>
                    </div>
                  )}

                  {proofSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>{proofSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploadingProof}
                    className="w-full py-1.5 px-3 bg-brand-primary hover:bg-navy-800 text-white font-semibold text-[11px] rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingProof ? 'Uploading...' : 'Re-submit ID for Verification'}</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-900">Unverified Student</strong>
                    <span>Selecting a college registers intent. Upload ID proof or submit a verified offer letter to unlock the badge.</span>
                  </div>
                </div>

                {/* Upload ID Proof Form */}
                <form onSubmit={handleUploadProof} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Upload Student ID / Bonafide Proof:
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      setProofFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                      setProofError('');
                    }}
                    className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                  />

                  {proofFile && (
                    <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-200 text-[10px] text-purple-900 flex items-center justify-between">
                      <span className="truncate max-w-[170px] font-medium">{proofFile.name}</span>
                      <span className="text-slate-500 font-mono">{(proofFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}

                  {proofError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{proofError}</span>
                    </div>
                  )}

                  {proofSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>{proofSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploadingProof}
                    className="w-full py-1.5 px-3 bg-brand-primary hover:bg-navy-800 text-white font-semibold text-[11px] rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingProof ? 'Uploading...' : 'Submit ID for Verification'}</span>
                  </button>
                </form>

                <div className="pt-1">
                  <Link
                    to="/submit-offer"
                    className="inline-flex items-center gap-1 text-[11px] text-brand-secondary font-semibold hover:underline"
                  >
                    <span>Or verify via Offer Letter Submission</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-base text-slate-900">Personal Settings</h3>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Public Pseudonym (Used in campus community discussions and Q&A)
              </label>
              <input
                type="text"
                required
                value={formData.pseudonym}
                onChange={(e) => setFormData({ ...formData, pseudonym: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Protects your identity when posting questions or participating in discussions.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Graduation Batch Year</label>
              <input
                type="number"
                min={2018}
                max={2030}
                value={formData.graduationYear}
                onChange={(e) => setFormData({ ...formData, graduationYear: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
              />
            </div>

            {/* Privacy Consent */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="consentCheckbox"
                  checked={formData.privacyConsent}
                  onChange={(e) => setFormData({ ...formData, privacyConsent: e.target.checked })}
                  className="mt-1 w-4 h-4 text-brand-secondary rounded border-slate-300"
                />
                <label htmlFor="consentCheckbox" className="font-semibold text-slate-800 cursor-pointer">
                  Data Aggregation Consent (Indian DPDP Act Compliance)
                </label>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                Enabling this allows Placement Reality to incorporate your verified offers into aggregated charts, salary percentiles, and median computations. Revoking consent excludes your submissions from public platform analytics.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 bg-brand-primary text-white font-semibold rounded-xl hover:bg-navy-800 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Preferences'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
