import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collegeApi } from '../api/collegeApi';
import { AddCollegeModal } from '../components/common/AddCollegeModal';
import { validateCollegeEmail } from '../utils/collegeEmailValidator';
import {
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  FileCheck2,
  Lock,
  Mail,
  User,
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Briefcase,
  Star,
  FileText,
  Sparkles,
  Layers,
  ChevronDown,
  Info,
  Check,
  Eye,
} from 'lucide-react';

export const JoinUsPage = ({ initialTab = 'join' }) => {
  const { login, submitStudentJoin, isAuthenticated, user, isModerator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State: 'join' (Student Verification Form) | 'signin' (Login Form)
  const [activeTab, setActiveTab] = useState(
    location.pathname === '/login' || initialTab === 'signin' ? 'signin' : 'join'
  );

  useEffect(() => {
    if (location.pathname === '/login') {
      setActiveTab('signin');
    } else if (location.pathname === '/register' || location.pathname === '/join-us') {
      setActiveTab('join');
    }
  }, [location.pathname]);

  // If already authenticated and not in forced password change, redirect appropriately
  useEffect(() => {
    if (isAuthenticated && !user?.mustChangePassword) {
      if (isModerator) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, isModerator, navigate]);

  // College Data
  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [isAddCollegeModalOpen, setIsAddCollegeModalOpen] = useState(false);

  // Student Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    collegeId: '',
    collegeName: '',
    academicSession: '2026-2027',
    graduationYear: 2026,
    departmentName: 'Computer Science & Engineering',
    degree: 'B.Tech',
    placementStatus: 'placed', // 'placed' | 'seeking' | 'higher_studies'
    companyName: '',
    jobRole: 'Software Development Engineer',
    annualCtcLpa: '',
    fixedCompensationLpa: '',
    offerType: 'On-Campus Full-Time',
    rating: 5,
    comment: '',
    batchMedianLPA: '',
    batchAvgLPA: '',
    batchHighestLPA: '',
    batchPlacementRate: '',
    isPseudonymous: true,
    privacyConsent: true,
  });

  // Files State
  const [idProofFile, setIdProofFile] = useState(null);
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  const [offerLetterPreview, setOfferLetterPreview] = useState(null);

  const idFileInputRef = useRef(null);
  const offerFileInputRef = useRef(null);

  // Submission Status
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [emailValidation, setEmailValidation] = useState(null);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Fetch colleges list
  useEffect(() => {
    collegeApi
      .getColleges({ limit: 120 })
      .then((res) => {
        if (res.data?.success && res.data.data?.colleges) {
          setColleges(res.data.data.colleges);
        }
      })
      .catch((err) => console.warn('[Colleges Load Error]', err))
      .finally(() => setLoadingColleges(false));
  }, []);

  const handleIdFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdProofFile(file);
      if (file.type.startsWith('image/')) {
        setIdProofPreview(URL.createObjectURL(file));
      } else {
        setIdProofPreview(null);
      }
    }
  };

  const handleOfferFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setOfferLetterFile(file);
      if (file.type.startsWith('image/')) {
        setOfferLetterPreview(URL.createObjectURL(file));
      } else {
        setOfferLetterPreview(null);
      }
    }
  };

  const handleCollegeAdded = (newCollege) => {
    setColleges((prev) => [newCollege, ...prev]);
    setFormData((prev) => ({
      ...prev,
      collegeId: newCollege._id,
      collegeName: newCollege.name,
    }));
    if (formData.email?.trim()) {
      setEmailValidation(validateCollegeEmail(formData.email, newCollege));
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!formData.collegeId) {
      setSubmitError('Please select your college or institute from the list.');
      return;
    }

    const selectedCollege = colleges.find((c) => c._id === formData.collegeId);
    const emailCheck = validateCollegeEmail(formData.email, selectedCollege);
    if (!emailCheck.isValid) {
      setEmailValidation(emailCheck);
      setSubmitError(emailCheck.message);
      return;
    }

    if (!idProofFile) {
      setSubmitError('A College ID Card or enrollment proof document is mandatory for student verification.');
      return;
    }

    if (formData.placementStatus === 'placed') {
      if (!formData.companyName || !formData.annualCtcLpa) {
        setSubmitError('Please provide company name and annual package (CTC) for placed status.');
        return;
      }
      if (!offerLetterFile) {
        setSubmitError('An Offer Letter or campus selection document is mandatory to verify placement claims.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('collegeId', formData.collegeId);
      data.append('departmentName', formData.departmentName);
      data.append('academicSession', formData.academicSession);
      data.append('graduationYear', formData.graduationYear);
      data.append('degree', formData.degree);
      data.append('placementStatus', formData.placementStatus);
      data.append('isPseudonymous', formData.isPseudonymous);
      data.append('privacyConsent', formData.privacyConsent);

      data.append('idProofDocument', idProofFile);

      if (formData.placementStatus === 'placed') {
        data.append('companyName', formData.companyName);
        data.append('jobRole', formData.jobRole);
        data.append('annualCtcLpa', formData.annualCtcLpa);
        if (formData.fixedCompensationLpa) {
          data.append('fixedCompensationLpa', formData.fixedCompensationLpa);
        }
        data.append('offerType', formData.offerType);
        if (offerLetterFile) {
          data.append('offerLetterDocument', offerLetterFile);
        }
      }

      if (formData.comment) {
        data.append('rating', formData.rating);
        data.append('comment', formData.comment);
      }

      if (formData.batchMedianLPA) data.append('batchMedianLPA', formData.batchMedianLPA);
      if (formData.batchAvgLPA) data.append('batchAvgLPA', formData.batchAvgLPA);
      if (formData.batchHighestLPA) data.append('batchHighestLPA', formData.batchHighestLPA);
      if (formData.batchPlacementRate) data.append('batchPlacementRate', formData.batchPlacementRate);

      const res = await submitStudentJoin(data);
      setSubmitSuccess(res);
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please check the form fields and file attachments.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setSignInError('');
    setSignInLoading(true);

    try {
      const loggedUser = await login(signInEmail, signInPassword);
      if (loggedUser?.mustChangePassword) {
        // Modal will automatically open and prompt for password change
        return;
      }
      if (['moderator', 'admin'].includes(loggedUser?.role)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setSignInError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setSignInLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Hero */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Students &amp; Seniors Verification • Zero Fabricated Stats</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
            Students &amp; Seniors: Verification &amp; Placement Reality Portal
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            For enrolled engineering students and seniors to authenticate credentials, report cohort batch metrics (Median, Average, Highest LPA), and upload offer verification securely.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-200/80 p-1.5 rounded-full inline-flex shadow-inner border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'join'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Students &amp; Seniors Sign Up &amp; Verification</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'signin'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Sign In (Students &amp; Lead Verifier)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: JOIN US (STUDENT VERIFICATION PORTAL) */}
        {activeTab === 'join' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl shadow-slate-100">
            {submitSuccess ? (
              <div className="text-center py-10 space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-navy-950">
                  Verification Documents Submitted Successfully!
                </h2>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 max-w-xl mx-auto text-xs text-emerald-800 text-left space-y-2">
                  <p className="font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Queued for Lead Verifier: placement.reality1@gmail.com</span>
                  </p>
                  <p>
                    Your College ID Card and placement details have been recorded securely. The Lead Verifier will review your evidence against institutional records.
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Your profile status is currently <strong>Pending Verification</strong>. Once approved, your Verified Student badge will activate on benchmarks.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  <Link
                    to="/dashboard"
                    className="px-6 py-3 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-navy-800 transition shadow-sm flex items-center gap-2"
                  >
                    <span>Go to Student Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/student-verified"
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                  >
                    <span>Browse Verified Student Benchmarks</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStudentSubmit} className="space-y-8">
                {submitError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Section 1: Student Account Credentials */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User className="w-4 h-4 text-brand-primary" />
                    <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide">
                      1. Student Identity &amp; Account
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Official College Email ID <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          No Personal Email Accepted
                        </span>
                      </div>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, email: val });
                          if (val.trim()) {
                            const selCollege = colleges.find((c) => c._id === formData.collegeId);
                            setEmailValidation(validateCollegeEmail(val, selCollege));
                          } else {
                            setEmailValidation(null);
                          }
                        }}
                        onBlur={() => {
                          if (formData.email.trim()) {
                            const selCollege = colleges.find((c) => c._id === formData.collegeId);
                            setEmailValidation(validateCollegeEmail(formData.email, selCollege));
                          }
                        }}
                        placeholder="student@college.edu.in"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-colors ${
                          emailValidation
                            ? emailValidation.isValid
                              ? 'border-emerald-500 bg-emerald-50/20 text-slate-900 focus:ring-emerald-500'
                              : 'border-rose-500 bg-rose-50/20 text-slate-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-brand-primary'
                        }`}
                      />
                      {emailValidation && (
                        <p
                          className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${
                            emailValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {emailValidation.isValid ? '✓ ' : '❌ '}
                          {emailValidation.message}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Create Password (minimum 6 characters) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: College Affiliation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-brand-primary" />
                      <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide">
                        2. College &amp; Academic Association
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddCollegeModalOpen(true)}
                      className="text-xs text-brand-secondary hover:underline font-bold flex items-center gap-1"
                    >
                      + Add Unlisted College
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Institution / University <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.collegeId}
                        onChange={(e) => {
                          const newCollegeId = e.target.value;
                          setFormData({ ...formData, collegeId: newCollegeId });
                          if (formData.email?.trim()) {
                            const selCollege = colleges.find((c) => c._id === newCollegeId);
                            setEmailValidation(validateCollegeEmail(formData.email, selCollege));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary focus:outline-none"
                      >
                        <option value="">-- Choose your college from the directory --</option>
                        {colleges.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} {c.city ? `(${c.city})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Can't find your college? Click "+ Add Unlisted College" above to register it.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Session <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.academicSession}
                        onChange={(e) => setFormData({ ...formData, academicSession: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value="2026-2027">2026–27 (Current Final Year)</option>
                        <option value="2025-2026">2025–26 (Graduating Batch)</option>
                        <option value="2024-2025">2024–25 (Recent Batch)</option>
                        <option value="2023-2024">2023–24</option>
                        <option value="2022-2023">2022–23</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Graduation Year <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="2018"
                        max="2030"
                        value={formData.graduationYear}
                        onChange={(e) => setFormData({ ...formData, graduationYear: parseInt(e.target.value, 10) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Branch / Specialization <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.departmentName}
                        onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                        placeholder="e.g. Computer Science & Engineering"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Degree / Course</label>
                      <select
                        value={formData.degree}
                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value="B.Tech">B.Tech / B.E.</option>
                        <option value="Dual Degree">Dual Degree (B.Tech + M.Tech)</option>
                        <option value="M.Tech">M.Tech</option>
                        <option value="MCA">MCA</option>
                        <option value="BCA">BCA</option>
                        <option value="MBA">MBA</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: College ID Card Proof (MANDATORY) */}
                <div className="space-y-3 bg-amber-50/40 p-5 rounded-2xl border border-amber-200/80">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="text-sm font-bold text-navy-950">
                        3. Upload Student College ID Proof <span className="text-rose-500">*</span>
                      </h3>
                      <p className="text-[11px] text-slate-600">
                        College ID Card, Bonafide Certificate, or Official Grade Sheet (PDF, JPG, PNG up to 5MB)
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => idFileInputRef.current?.click()}
                    className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white p-6 rounded-2xl cursor-pointer text-center transition flex flex-col items-center justify-center gap-2"
                  >
                    <UploadCloud className="w-8 h-8 text-amber-500" />
                    <p className="text-xs font-semibold text-slate-800">
                      {idProofFile ? `Selected: ${idProofFile.name}` : 'Click to Browse or Drag College ID Card here'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Supports PDF, PNG, JPG (Encrypted storage - accessible only by Lead Verifier)
                    </p>
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleIdFileChange}
                      className="hidden"
                    />
                  </div>

                  {idProofPreview && (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-amber-200">
                      <img src={idProofPreview} alt="ID Preview" className="w-14 h-14 object-cover rounded-lg border" />
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">{idProofFile?.name}</p>
                        <p className="text-slate-500 text-[10px]">{(idProofFile?.size / 1024).toFixed(1)} KB • Ready for upload</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 4: Placement Status & Offer Letter Proof */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Briefcase className="w-4 h-4 text-brand-primary" />
                    <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide">
                      4. Placement Status &amp; Offer Verification
                    </h3>
                  </div>

                  {/* Radio Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        formData.placementStatus === 'placed'
                          ? 'border-brand-primary bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="placementStatus"
                        value="placed"
                        checked={formData.placementStatus === 'placed'}
                        onChange={(e) => setFormData({ ...formData, placementStatus: e.target.value })}
                        className="mt-0.5 text-brand-primary"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">💼 Placed</p>
                        <p className="text-[10px] text-slate-500">I have received a job offer letter</p>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        formData.placementStatus === 'seeking'
                          ? 'border-brand-primary bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="placementStatus"
                        value="seeking"
                        checked={formData.placementStatus === 'seeking'}
                        onChange={(e) => setFormData({ ...formData, placementStatus: e.target.value })}
                        className="mt-0.5 text-brand-primary"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">🔍 Seeking Offer</p>
                        <p className="text-[10px] text-slate-500">Looking for placement opportunities</p>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        formData.placementStatus === 'higher_studies'
                          ? 'border-brand-primary bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="placementStatus"
                        value="higher_studies"
                        checked={formData.placementStatus === 'higher_studies'}
                        onChange={(e) => setFormData({ ...formData, placementStatus: e.target.value })}
                        className="mt-0.5 text-brand-primary"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">📚 Higher Studies / Other</p>
                        <p className="text-[10px] text-slate-500">GATE, CAT, GRE, or Startup</p>
                      </div>
                    </label>
                  </div>

                  {/* IF PLACED: REVEAL OFFER FIELDS & OFFER LETTER UPLOAD */}
                  {formData.placementStatus === 'placed' && (
                    <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Recruiting Company <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required={formData.placementStatus === 'placed'}
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            placeholder="e.g. Google, Microsoft, TCS, Infosys"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Job Profile / Role
                          </label>
                          <input
                            type="text"
                            value={formData.jobRole}
                            onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                            placeholder="e.g. Software Engineer, SDE-1"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Annual CTC Package (in ₹ LPA) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            required={formData.placementStatus === 'placed'}
                            value={formData.annualCtcLpa}
                            onChange={(e) => setFormData({ ...formData, annualCtcLpa: e.target.value })}
                            placeholder="e.g. 14.5"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Fixed Base Salary (in ₹ LPA, optional)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.fixedCompensationLpa}
                            onChange={(e) => setFormData({ ...formData, fixedCompensationLpa: e.target.value })}
                            placeholder="e.g. 12.0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Offer Category
                          </label>
                          <select
                            value={formData.offerType}
                            onChange={(e) => setFormData({ ...formData, offerType: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-brand-primary"
                          >
                            <option value="On-Campus Full-Time">On-Campus Full-Time</option>
                            <option value="Off-Campus Full-Time">Off-Campus Full-Time</option>
                            <option value="Pre-Placement Offer (PPO)">Pre-Placement Offer (PPO from Internship)</option>
                          </select>
                        </div>
                      </div>

                      {/* Offer Letter Upload Dropzone */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-brand-primary" />
                          <span>Attach Offer Letter / Selection Email Proof <span className="text-rose-500">*</span></span>
                        </label>
                        <div
                          onClick={() => offerFileInputRef.current?.click()}
                          className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white p-5 rounded-2xl cursor-pointer text-center transition flex flex-col items-center justify-center gap-2"
                        >
                          <UploadCloud className="w-7 h-7 text-blue-500" />
                          <p className="text-xs font-semibold text-slate-800">
                            {offerLetterFile ? `Selected: ${offerLetterFile.name}` : 'Click to Upload Official Offer Letter / LOI'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            PDF, JPG, PNG (Compensation details verified anonymously; personal credentials remain private)
                          </p>
                          <input
                            ref={offerFileInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            onChange={handleOfferFileChange}
                            className="hidden"
                          />
                        </div>
                        {offerLetterPreview && (
                          <div className="mt-2 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-blue-200">
                            <img src={offerLetterPreview} alt="Offer Preview" className="w-12 h-12 object-cover rounded-lg border" />
                            <div className="text-xs">
                              <p className="font-bold text-slate-800">{offerLetterFile?.name}</p>
                              <p className="text-slate-500 text-[10px]">{(offerLetterFile?.size / 1024).toFixed(1)} KB • Ready for verification</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 4b: Known Batch Placement Metrics */}
                <div className="space-y-3 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Known Batch Placement Reality (Optional — for enrolled students auditing batch trends)
                      </h3>
                      <p className="text-[11px] text-slate-600">
                        If you are an enrolled student or senior who knows the real placement metrics of your college batch, report them below:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Median CTC (LPA)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 6.0"
                        value={formData.batchMedianLPA}
                        onChange={(e) => setFormData({ ...formData, batchMedianLPA: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Average CTC (LPA)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 7.0"
                        value={formData.batchAvgLPA}
                        onChange={(e) => setFormData({ ...formData, batchAvgLPA: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Highest Package (LPA)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 45.0"
                        value={formData.batchHighestLPA}
                        onChange={(e) => setFormData({ ...formData, batchHighestLPA: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Placement Rate (%)
                      </label>
                      <input
                        type="number"
                        step="1"
                        placeholder="e.g. 72"
                        value={formData.batchPlacementRate}
                        onChange={(e) => setFormData({ ...formData, batchPlacementRate: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Student Ground-Truth Comment */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide">
                      5. Verified Student Placement Review &amp; Comment
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Placement Cell Transparency Rating
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          className={`p-1.5 rounded-lg transition ${
                            formData.rating >= star ? 'text-amber-500' : 'text-slate-300'
                          }`}
                        >
                          <Star className="w-6 h-6 fill-current" />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-2">
                        {formData.rating} / 5 Stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transparent Ground-Truth Comment (Optional but valuable)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      placeholder="Share your authentic experience: actual mass-recruitment conditions, recruiter turnout, CTC inflation reality, or placement cell support..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                {/* Section 6: Privacy Protection & Consent */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPseudonymous}
                      onChange={(e) => setFormData({ ...formData, isPseudonymous: e.target.checked })}
                      className="mt-0.5 rounded text-brand-primary"
                    />
                    <div>
                      <span className="font-bold text-slate-900">
                        🛡️ Protect My Identity (Recommended)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Display my feedback and placement statistics under an anonymous verified pseudonym (e.g. <code>Student_9B4A</code>) on public benchmark pages.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-200">
                    <input
                      type="checkbox"
                      required
                      checked={formData.privacyConsent}
                      onChange={(e) => setFormData({ ...formData, privacyConsent: e.target.checked })}
                      className="mt-0.5 rounded text-brand-primary"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">
                        I confirm that the submitted ID proof and placement documents are authentic.
                      </span>
                      <p className="text-[11px] text-slate-500">
                        I authorize the Lead Verifier to examine these documents strictly for college statistical verification.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-gradient-to-r from-brand-primary to-navy-900 hover:from-navy-900 hover:to-brand-primary text-white font-extrabold text-sm rounded-2xl transition shadow-lg shadow-navy-900/20 flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Encrypting &amp; Submitting Verification Proofs...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Submit ID &amp; Offer for Lead Verification</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: SIGN IN (STUDENTS & LEAD VERIFIER) */}
        {activeTab === 'signin' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl shadow-slate-100 max-w-lg mx-auto">
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Sign In</h2>
              <p className="text-xs text-slate-500">
                Access your student verification portal or log in as Lead Verifier (<code>placement.reality1@gmail.com</code>).
              </p>
            </div>

            {signInError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{signInError}</span>
              </div>
            )}

            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="name@college.ac.in or verifier email"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-xs text-brand-secondary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={signInLoading}
                className="w-full py-3 bg-brand-primary hover:bg-navy-800 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {signInLoading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Are you a new student wanting to submit verification?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className="text-brand-secondary font-bold hover:underline"
                >
                  Join Us &amp; Submit Proof
                </button>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Unlisted College Modal */}
      {isAddCollegeModalOpen && (
        <AddCollegeModal
          isOpen={isAddCollegeModalOpen}
          onClose={() => setIsAddCollegeModalOpen(false)}
          onCollegeAdded={handleCollegeAdded}
        />
      )}
    </div>
  );
};
