import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collegeApi } from '../api/collegeApi';
import { placementApi } from '../api/placementApi';
import { offerApi } from '../api/offerApi';
import { internshipApi } from '../api/internshipApi';
import { DataBadge } from '../components/common/DataBadge';
import { TierBadge } from '../components/common/TierBadge';
import { SkeletonLoader } from '../components/common/FeedbackComponents';
import {
  GraduationCap,
  TrendingUp,
  Briefcase,
  Award,
  PlusCircle,
  FileCheck2,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Building,
  Star,
  MessageSquare,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const StudentDashboard = () => {
  const { user, refreshProfile } = useAuth();

  const [colleges, setColleges] = useState([]);
  const [activeCollege, setActiveCollege] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guarantee fresh profile from backend on mount
  useEffect(() => {
    if (typeof refreshProfile === 'function') {
      refreshProfile();
    }
  }, []);

  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true);
      try {
        const colRes = await collegeApi.getColleges({ limit: 50 });
        const list = colRes.data?.success ? colRes.data.data.colleges : [];
        setColleges(list);

        // Select user's affiliated college
        let targetCol = null;
        if (user?.collegeId) {
          if (typeof user.collegeId === 'object' && user.collegeId._id) {
            targetCol = user.collegeId;
          } else {
            const userColId = user.collegeId._id || user.collegeId;
            targetCol = list.find((c) => c._id === userColId);
            if (!targetCol) {
              try {
                const singleRes = await collegeApi.getCollegeById(userColId);
                if (singleRes.data?.success) targetCol = singleRes.data.data.college;
              } catch (_) {}
            }
          }
        }

        // If user has no college association, use first from list as baseline
        if (!targetCol && list.length > 0) {
          targetCol = list[0];
        }

        setActiveCollege(targetCol);

        if (targetCol && targetCol._id) {
          const seasonRes = await collegeApi.getSeasons(targetCol._id);
          if (seasonRes.data?.success && seasonRes.data.data.seasons.length > 0) {
            const latestSeason = seasonRes.data.data.seasons[0];
            const [analyticsRes, trendsRes] = await Promise.all([
              placementApi.getPlacementDashboard(targetCol._id, latestSeason._id),
              placementApi.getHistoricalTrends(targetCol._id),
            ]);
            if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.data);
            if (trendsRes.data?.success) setTrends(trendsRes.data.data.trends);
          }
        }

        const [offersRes, internRes] = await Promise.all([
          offerApi.getMyOffers(),
          internshipApi.getInternships({ limit: 3 }),
        ]);
        if (offersRes.data?.success) setMyOffers(offersRes.data.data.offers);
        if (internRes.data?.success) setInternships(internRes.data.data.internships);
      } catch (err) {
        console.error('[Dashboard Init Error]', err);
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [user?._id || user?.id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SkeletonLoader count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-brand-primary to-navy-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-purple-300 font-semibold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>Student Intelligence Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Tracking ground-truth placement outcomes for{' '}
            <strong className="text-white">
              {activeCollege?.name || (typeof user?.collegeId === 'object' ? user?.collegeId?.name : null) || 'Your Institution'}
            </strong>.
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs">
            {user?.isCollegeVerified ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Document Verified Student</span>
              </span>
            ) : user?.collegeVerificationStatus === 'rejected' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Verification Rejected by Lead Verifier</span>
              </span>
            ) : user?.collegeVerificationStatus === 'pending' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Affiliation Under Review
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Self-Reported Affiliation (Awaiting ID Verification)
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/submit-offer"
            className="px-4 py-2.5 bg-white text-navy-950 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-brand-primary" />
            <span>Submit New Offer</span>
          </Link>
          <Link
            to="/top-private-engineering-colleges-india"
            className="px-4 py-2.5 bg-brand-primary hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Award className="w-4 h-4" />
            <span>Top 50 Private Colleges</span>
          </Link>
        </div>
      </div>

      {/* Affiliation Verification Feedback Alert Banner */}
      {user?.collegeVerificationStatus === 'rejected' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-rose-900">
                  Affiliation Verification Notice
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                <strong>Feedback from Lead Verifier:</strong>{' '}
                {user?.collegeVerificationRejectionReason || 'The registered email or uploaded ID proof does not match institutional records.'}
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="shrink-0 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>Update ID in Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* College Placement Highlights & Trends */}
      {analytics && (
        !analytics.hasVerifiedData || !analytics.headlineStats ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">No verified placement data available yet for {activeCollege?.name}.</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Verified statistics will display here as soon as student offer letters or official institute reports are validated by moderators.
            </p>
            <div className="pt-1">
              <Link
                to="/submit-offer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit an Offer for Verification</span>
              </Link>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Headline KPIs */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">{activeCollege?.shortName} Outcomes</span>
                <h3 className="font-bold text-base text-slate-900">{analytics.season.academicYear} Session</h3>
              </div>
              <DataBadge status={analytics.provenance.verificationStatus} size="xs" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-600">Median Package:</span>
                <span className="text-base font-extrabold text-brand-primary">{analytics.headlineStats.medianPackageLPA} LPA</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-600">Average Package:</span>
                <span className="text-base font-extrabold text-slate-800">{analytics.headlineStats.averagePackageLPA} LPA</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-600">Unique Placed:</span>
                <span className="text-base font-extrabold text-emerald-600">{analytics.headlineStats.uniqueStudentsPlaced}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-600">Gross Job Offers:</span>
                <span className="text-base font-extrabold text-slate-700">{analytics.headlineStats.totalJobOffers}</span>
              </div>
            </div>

            <Link
              to={`/colleges/${activeCollege?.slug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline pt-2"
            >
              <span>Explore full institutional dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Historical Trend Line */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Historical Median Growth (LPA)</h3>
                <p className="text-xs text-slate-500">Documented compensation trajectory over recorded academic years</p>
              </div>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="academicYear" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="medianPackageLPA" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        )
      )}

      {/* Two-Column Grid: My Submissions & Internship Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Filed Offers */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-brand-secondary" />
              <span>My Submitted Offers {myOffers.length > 0 && `(${myOffers.length})`}</span>
            </h3>
            <Link to="/submit-offer" className="text-xs text-brand-secondary font-semibold hover:underline">
              Submit another
            </Link>
          </div>

          {myOffers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              You haven't filed any offers yet. Submit your verified outcome to aid batch transparency!
            </div>
          ) : (
            <div className="space-y-3">
              {myOffers.slice(0, 5).map((offer) => (
                <div key={offer._id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs hover:border-slate-300 transition">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block">{offer.companyName}</span>
                    <span className="text-slate-500 text-[11px]">{offer.jobRole}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-extrabold text-brand-primary block text-sm">₹{offer.annualCtcLpa} LPA</span>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        offer.verificationStatus === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : offer.verificationStatus === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {offer.verificationStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relevant Internship Opportunities */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" />
              <span>Recent Verified Internships</span>
            </h3>
            <Link to="/community" className="text-xs text-purple-600 font-semibold hover:underline">
              Join Q&A
            </Link>
          </div>

          <div className="space-y-3">
            {internships.map((intern) => (
              <div key={intern._id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{intern.companyName}</span>
                  <span className="text-slate-500">{intern.internshipRole} • {intern.workMode}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 block">₹{intern.monthlyStipendInr?.toLocaleString('en-IN')}/mo</span>
                  <span className="text-[10px] text-slate-400">{intern.startMonthYear}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          to="/compare"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-primary shadow-xs transition group space-y-2"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-primary flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 group-hover:text-brand-primary transition">Multi-College Comparison</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Stack up your college against Tier 1 & 2 peers on median packages and verified recruiter diversity.
          </p>
        </Link>

        <Link
          to="/community"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-primary shadow-xs transition group space-y-2"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 group-hover:text-orange-600 transition">Campus Q&A & Discussions</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Discuss college realities, ask questions about campus placement drives, and get answers from verified peers.
          </p>
        </Link>

        <Link
          to="/top-private-engineering-colleges-india"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-primary shadow-xs transition group space-y-2"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition">Top 50 Private Colleges</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Directly benchmark verified median packages, highest CTCs, and NIRF rankings across top private campuses.
          </p>
        </Link>
      </div>
    </div>
  );
};
