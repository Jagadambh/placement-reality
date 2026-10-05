import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collegeApi } from '../api/collegeApi';
import { GraduationCap, ShieldAlert, AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { AddCollegeModal } from '../components/common/AddCollegeModal';

export const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isAddCollegeModalOpen, setIsAddCollegeModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    collegeId: '',
    departmentId: '',
    graduationYear: 2025,
    privacyConsent: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    collegeApi.getColleges({ limit: 50 }).then((res) => {
      if (res.data?.success) {
        setColleges(res.data.data.colleges);
      }
    }).catch(console.error);
  }, []);

  const handleCollegeChange = async (e) => {
    const colId = e.target.value;
    setFormData({ ...formData, collegeId: colId, departmentId: '' });
    if (colId) {
      try {
        const res = await collegeApi.getDepartments(colId);
        if (res.data?.success) {
          setDepartments(res.data.data.departments);
        }
      } catch (err) {
        setDepartments([]);
      }
    } else {
      setDepartments([]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please review your form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center mx-auto shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Create Your Account</h2>
          <p className="text-xs text-slate-500">Join the movement for authentic Indian placement intelligence</p>
        </div>

        {/* Verification Architecture Notice */}
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Important Policy:</span> Selecting your college during registration records your association. In accordance with platform integrity rules, you will not receive a "Verified Student" badge until you upload valid college ID or offer letter evidence.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Rohan Sen"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rohan@student.ac.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Associated College</label>
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
                value={formData.collegeId}
                onChange={handleCollegeChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-white"
              >
                <option value="">Select College</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.shortName || c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                disabled={!formData.collegeId}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-white disabled:bg-slate-50"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year</label>
              <input
                type="number"
                min={2020}
                max={2030}
                value={formData.graduationYear}
                onChange={(e) => setFormData({ ...formData, graduationYear: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-white"
              >
                <option value="student">Student / Alum</option>
                <option value="moderator">Community Moderator</option>
              </select>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="privacyConsent"
              checked={formData.privacyConsent}
              onChange={(e) => setFormData({ ...formData, privacyConsent: e.target.checked })}
              className="mt-1 w-4 h-4 text-brand-secondary rounded border-slate-300 focus:ring-brand-secondary"
            />
            <label htmlFor="privacyConsent" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              I consent to Placement Reality anonymously aggregating any submitted placement outcomes into public statistical models. I understand that individual offer documents will never be published publicly.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-primary hover:bg-navy-800 text-white font-semibold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-brand-secondary font-semibold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>

      {/* Community Add College Modal */}
      <AddCollegeModal
        isOpen={isAddCollegeModalOpen}
        onClose={() => setIsAddCollegeModalOpen(false)}
        onCollegeAdded={handleCollegeAdded}
      />
    </div>
  );
};
