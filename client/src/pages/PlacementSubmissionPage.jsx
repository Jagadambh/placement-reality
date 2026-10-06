import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collegeApi } from '../api/collegeApi';
import { offerApi } from '../api/offerApi';
import { DataBadge } from '../components/common/DataBadge';
import {
  FileCheck2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  Lock,
  Clock,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { AddCollegeModal } from '../components/common/AddCollegeModal';

export const PlacementSubmissionPage = () => {
  const { user } = useAuth();

  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [isAddCollegeModalOpen, setIsAddCollegeModalOpen] = useState(false);

  const getColId = (col) => (col && typeof col === 'object' ? col._id : col) || '';
  const getDeptId = (dept) => (dept && typeof dept === 'object' ? dept._id : dept) || '';

  const [formData, setFormData] = useState({
    collegeId: getColId(user?.collegeId),
    departmentId: getDeptId(user?.departmentId),
    seasonId: '',
    graduationYear: user?.graduationYear || 2024,
    companyName: '',
    jobRole: '',
    offerDate: new Date().toISOString().split('T')[0],
    annualCtcLpa: '',
    fixedCompensationLpa: '',
    variableCompensationLpa: '',
    offerType: 'On-Campus Full-Time',
    acceptedOffer: 'Yes',
    joinedCompany: 'Yet to Join',
    consentToAggregate: true,
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  // Sync user defaults when auth profile arrives
  useEffect(() => {
    if (user) {
      const colId = getColId(user.collegeId);
      const deptId = getDeptId(user.departmentId);
      setFormData((prev) => ({
        ...prev,
        collegeId: prev.collegeId || colId,
        departmentId: prev.departmentId || deptId,
        graduationYear: prev.graduationYear || user.graduationYear || 2024,
      }));
    }
  }, [user]);

  useEffect(() => {
    collegeApi.getColleges({ limit: 50 }).then((res) => {
      if (res.data?.success) setColleges(res.data.data.colleges);
    });
    fetchMyOffers();
  }, []);

  useEffect(() => {
    const cleanCollegeId = getColId(formData.collegeId);
    if (cleanCollegeId) {
      collegeApi.getDepartments(cleanCollegeId).then((res) => {
        if (res.data?.success) setDepartments(res.data.data.departments);
      });
      collegeApi.getSeasons(cleanCollegeId).then((res) => {
        if (res.data?.success) {
          setSeasons(res.data.data.seasons);
          if (res.data.data.seasons.length > 0 && !formData.seasonId) {
            setFormData((prev) => ({ ...prev, seasonId: res.data.data.seasons[0]._id }));
          }
        }
      });
    }
  }, [formData.collegeId]);

  const fetchMyOffers = async () => {
    try {
      const res = await offerApi.getMyOffers();
      if (res.data?.success) setMyOffers(res.data.data.offers);
    } catch (err) {
      console.warn('[My Offers Fetch Error]', err);
    }
  };

  const handleCollegeAdded = (newCollege, newDepts) => {
    setColleges((prev) => [newCollege, ...prev]);
    const firstDeptId = newDepts && newDepts.length > 0 ? newDepts[0]._id : '';
    setFormData((prev) => ({
      ...prev,
      collegeId: newCollege._id,
      departmentId: firstDeptId,
    }));
    if (newDepts && newDepts.length > 0) {
      setDepartments(newDepts);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage(null);
    setSubmitting(true);

    try {
      const formPayload = new FormData();
      const cleanColId = getColId(formData.collegeId);
      const cleanDeptId = getDeptId(formData.departmentId);
      const cleanSeasonId = getColId(formData.seasonId);

      Object.keys(formData).forEach((key) => {
        let val = formData[key];
        if (key === 'collegeId') val = cleanColId;
        if (key === 'departmentId') val = cleanDeptId;
        if (key === 'seasonId') val = cleanSeasonId;
        if (val !== undefined && val !== null) {
          formPayload.append(key, val);
        }
      });
      if (documentFile) {
        formPayload.append('supportingDocument', documentFile);
      }

      const res = await offerApi.submitOffer(formPayload);
      if (res.data?.success) {
        setMessage(res.data.message || 'Offer submitted successfully!');
        // Reset dynamic fields
        setFormData((prev) => ({
          ...prev,
          companyName: '',
          jobRole: '',
          annualCtcLpa: '',
          fixedCompensationLpa: '',
          variableCompensationLpa: '',
        }));
        setDocumentFile(null);
        fetchMyOffers();
      }
    } catch (err) {
      setError(err.message || 'Submission failed. Please check form fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Student Submissions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
          Submit Placement Outcome
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
          Help future students see beyond corporate brochures. Submit your placement or PPO details. All offer letters and personal details are encrypted and kept strictly confidential.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SUBMISSION FORM */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900">Offer Submission Form</h3>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Identity Protected</span>
            </span>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* College & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">College</label>
                  <button
                    type="button"
                    onClick={() => setIsAddCollegeModalOpen(true)}
                    className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span>+ Add unlisted</span>
                  </button>
                </div>
                <select
                  required
                  value={formData.collegeId}
                  onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="">Select College</option>
                  {colleges.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.shortName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  required
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Season & Graduation Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Placement Season</label>
                <select
                  required
                  value={formData.seasonId}
                  onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="">Select Season</option>
                  {seasons.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.academicYear} ({s.seasonStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year</label>
                <input
                  type="number"
                  required
                  min={2020}
                  max={2030}
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: parseInt(e.target.value, 10) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
                />
              </div>
            </div>

            {/* Company & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Microsoft, TCS, HighRadius"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Role</label>
                <input
                  type="text"
                  required
                  value={formData.jobRole}
                  onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                  placeholder="e.g. Associate Software Engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
                />
              </div>
            </div>

            {/* Compensation breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Annual CTC (in LPA) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0.5"
                  max="300"
                  value={formData.annualCtcLpa}
                  onChange={(e) => setFormData({ ...formData, annualCtcLpa: e.target.value })}
                  placeholder="e.g. 12.5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fixed CTC (LPA, optional)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.fixedCompensationLpa}
                  onChange={(e) => setFormData({ ...formData, fixedCompensationLpa: e.target.value })}
                  placeholder="e.g. 9.5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variable CTC (LPA, optional)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.variableCompensationLpa}
                  onChange={(e) => setFormData({ ...formData, variableCompensationLpa: e.target.value })}
                  placeholder="e.g. 3.0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary"
                />
              </div>
            </div>

            {/* Offer Type & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Offer Type</label>
                <select
                  value={formData.offerType}
                  onChange={(e) => setFormData({ ...formData, offerType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="On-Campus Full-Time">On-Campus Full-Time</option>
                  <option value="Pre-Placement Offer (PPO)">Pre-Placement Offer (PPO)</option>
                  <option value="Off-Campus">Off-Campus</option>
                  <option value="Pool Campus">Pool Campus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Accepted Offer?</label>
                <select
                  value={formData.acceptedOffer}
                  onChange={(e) => setFormData({ ...formData, acceptedOffer: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Undecided">Undecided</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Joined Company?</label>
                <select
                  value={formData.joinedCompany}
                  onChange={(e) => setFormData({ ...formData, joinedCompany: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="Yet to Join">Yet to Join</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* Document Upload */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-brand-secondary" />
                <span className="text-xs font-semibold text-slate-800">
                  Upload Confidential Offer Letter (PDF, JPG, PNG - Max 5MB)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your uploaded offer document is used exclusively by moderators to confirm authenticity. It is never displayed publicly or shared with colleges.
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-navy-800 cursor-pointer"
              />
              {documentFile && (
                <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selected: {documentFile.name} ({(documentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </div>

            {/* Aggregation Consent */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                type="checkbox"
                id="consentCheck"
                required
                checked={formData.consentToAggregate}
                onChange={(e) => setFormData({ ...formData, consentToAggregate: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand-secondary rounded border-slate-300 focus:ring-brand-secondary"
              />
              <label htmlFor="consentCheck" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                I authorize Placement Reality to incorporate this submission into anonymous statistical benchmarks (such as median CTC, salary brackets, and recruiter diversity).
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-primary hover:bg-navy-800 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Validating and Submitting...' : 'Submit Placement Record'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* SIDEBAR: MY SUBMISSIONS & VERIFICATION STATUS */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">My Submissions</h3>
            <p className="text-xs text-slate-500">Live verification status of your filed offers</p>

            {myOffers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                You haven't submitted any offers yet. Fill out the form to contribute!
              </div>
            ) : (
              <div className="space-y-3">
                {myOffers.map((offer) => {
                  const getStatusBadge = (status) => {
                    switch (status) {
                      case 'Verified':
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      case 'Under review':
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                      case 'Rejected':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      default:
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                    }
                  };

                  return (
                    <div key={offer._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{offer.companyName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(offer.verificationStatus)}`}>
                          {offer.verificationStatus}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex justify-between">
                        <span>{offer.jobRole}</span>
                        <strong className="text-brand-primary">{offer.annualCtcLpa} LPA</strong>
                      </div>
                      {offer.moderatorNotes && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          <strong>Note:</strong> {offer.moderatorNotes}
                        </div>
                      )}
                      {offer.isDuplicateFlag && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                          {offer.duplicateReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Verification Process Notice */}
          <div className="p-5 rounded-3xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>How We Verify Offers</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-purple-800">
              Moderators review anonymized offer letters within 24-48 hours. Once verified, your submission updates the college's verified student metrics and unlocks your platform contributor status.
            </p>
          </div>
        </div>
      </div>

      {/* Add College Modal */}
      <AddCollegeModal
        isOpen={isAddCollegeModalOpen}
        onClose={() => setIsAddCollegeModalOpen(false)}
        onCollegeAdded={handleCollegeAdded}
      />
    </div>
  );
};
