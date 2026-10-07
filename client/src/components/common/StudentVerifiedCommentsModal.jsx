import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  ShieldCheck,
  CheckCircle,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Award,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  ThumbsUp,
  Building,
  GraduationCap,
  Send,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { reviewApi } from '../../api/reviewApi';
import { collegeApi } from '../../api/collegeApi';
import { MethodologyExplanationModal } from './MethodologyExplanationModal';

const calcMedian = (arr) => {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].filter((n) => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
};

const calcAvg = (arr) => {
  if (!arr || arr.length === 0) return null;
  const valid = arr.filter((n) => typeof n === 'number' && !isNaN(n));
  if (valid.length === 0) return null;
  return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1));
};

export const StudentVerifiedCommentsModal = ({
  isOpen,
  onClose,
  college,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [studentStats, setStudentStats] = useState(null);
  const [categoryAverages, setCategoryAverages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Submission Form State
  const [formBranch, setFormBranch] = useState('Computer Science & Engineering');
  const [formYear, setFormYear] = useState('2026');
  const [formTitle, setFormTitle] = useState('');
  const [formReviewText, setFormReviewText] = useState('');
  const [formPros, setFormPros] = useState('');
  const [formCons, setFormCons] = useState('');
  const [formMedianLPA, setFormMedianLPA] = useState('');
  const [formAvgLPA, setFormAvgLPA] = useState('');
  const [formHighestLPA, setFormHighestLPA] = useState('');
  const [formPlacementRate, setFormPlacementRate] = useState('');
  const [formOverallRating, setFormOverallRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [formRatingPlacement, setFormRatingPlacement] = useState(5);
  const [formRatingInternship, setFormRatingInternship] = useState(5);
  const [formRatingAcademics, setFormRatingAcademics] = useState(5);

  useEffect(() => {
    if (!isOpen || !college) return;

    let isMounted = true;
    setLoading(true);
    setSubmitSuccess(false);

    // Initial local fallback from college
    const rawStats = college.studentVerifiedStats || {};
    const initReviews = college.verifiedStudentComments || [];
    setReviews(initReviews);

    const revMedians = initReviews.map((r) => r.reportedStats?.medianPackageLPA).filter((v) => v != null);
    const revAvgs = initReviews.map((r) => r.reportedStats?.averagePackageLPA).filter((v) => v != null);
    const revHighests = initReviews.map((r) => r.reportedStats?.highestPackageLPA).filter((v) => v != null);
    const revRates = initReviews.map((r) => r.reportedStats?.actualPlacementRate).filter((v) => v != null);

    const outcomesCount = Math.max(
      rawStats.verifiedStudentOutcomes ?? rawStats.sampleSize ?? 0,
      initReviews.length
    );
    const hasData = Boolean((rawStats.hasEnoughData || outcomesCount > 0) && (outcomesCount > 0 || revMedians.length > 0));

    const initialStats = {
      hasEnoughData: hasData,
      emptyStateMessage: hasData ? null : 'Not enough verified student data yet.',
      sampleSize: outcomesCount,
      verifiedStudentOutcomes: outcomesCount,
      verifiedPackageRecords: rawStats.verifiedPackageRecords ?? rawStats.totalVerifiedOffers ?? outcomesCount,
      placedVerifiedStudents: rawStats.placedVerifiedStudents ?? outcomesCount,
      medianPackageLPA: rawStats.verifiedMedianPackageLPA ?? rawStats.medianPackageLPA ?? calcMedian(revMedians) ?? null,
      averagePackageLPA: rawStats.averagePackageLPA ?? calcAvg(revAvgs) ?? null,
      highestPackageLPA: rawStats.highestPackageLPA ?? (revHighests.length > 0 ? Math.max(...revHighests) : null),
      actualPlacementRate: rawStats.observedPlacementRate ?? rawStats.actualPlacementRate ?? calcAvg(revRates) ?? null,
      observedPlacementRate: rawStats.observedPlacementRate ?? rawStats.actualPlacementRate ?? calcAvg(revRates) ?? null,
      dreamOffersPercent: rawStats.dreamOffersPercent ?? null,
      isLowSample: outcomesCount > 0 && outcomesCount < 10,
      confidenceScore: hasData ? 90 : 0,
      verifiedReviewsCount: initReviews.length,
    };

    setStudentStats(initialStats);

    // Fetch live intelligence and reviews from API
    const fetchApiData = async () => {
      try {
        const idToQuery = college._id || college.slug;
        const [reviewsRes, intelRes] = await Promise.allSettled([
          reviewApi.getCollegeReviews(idToQuery),
          collegeApi.getStudentVerifiedIntelligence(idToQuery),
        ]);

        if (isMounted) {
          let fetchedReviews = initReviews;
          let reviewStats = null;

          if (reviewsRes.status === 'fulfilled' && reviewsRes.value?.data?.success) {
            const rData = reviewsRes.value.data.data;
            if (rData.reviews && rData.reviews.length > 0) {
              fetchedReviews = rData.reviews;
              setReviews(rData.reviews);
            }
            if (rData.categoryAverages) {
              setCategoryAverages(rData.categoryAverages);
            }
            if (rData.studentVerifiedStats) {
              reviewStats = rData.studentVerifiedStats;
            }
          }

          let intel = null;
          if (intelRes.status === 'fulfilled' && intelRes.value?.data?.success) {
            intel = intelRes.value.data.data?.intelligence || intelRes.value.data.data;
          }

          // Live calculate metrics across reviews and server intelligence
          const currentMedians = fetchedReviews.map((r) => r.reportedStats?.medianPackageLPA).filter((v) => v != null);
          const currentAvgs = fetchedReviews.map((r) => r.reportedStats?.averagePackageLPA).filter((v) => v != null);
          const currentHighests = fetchedReviews.map((r) => r.reportedStats?.highestPackageLPA).filter((v) => v != null);
          const currentRates = fetchedReviews.map((r) => r.reportedStats?.actualPlacementRate).filter((v) => v != null);

          const liveOutcomes = Math.max(
            intel?.verifiedStudentOutcomes || 0,
            intel?.sampleSize || 0,
            reviewStats?.sampleSize || 0,
            fetchedReviews.length
          );

          const liveMedian =
            intel?.verifiedMedianPackageLPA ??
            intel?.medianPackageLPA ??
            reviewStats?.medianPackageLPA ??
            calcMedian(currentMedians) ??
            rawStats.verifiedMedianPackageLPA ??
            rawStats.medianPackageLPA ??
            null;

          const liveAvg =
            intel?.verifiedAveragePackageLPA ??
            intel?.averagePackageLPA ??
            reviewStats?.averagePackageLPA ??
            calcAvg(currentAvgs) ??
            rawStats.averagePackageLPA ??
            null;

          const liveHighest =
            intel?.verifiedHighestPackageLPA ??
            intel?.highestPackageLPA ??
            reviewStats?.highestPackageLPA ??
            (currentHighests.length > 0 ? Math.max(...currentHighests) : null) ??
            rawStats.highestPackageLPA ??
            null;

          const liveRate =
            intel?.observedPlacementRate ??
            intel?.actualPlacementRate ??
            reviewStats?.actualPlacementRate ??
            calcAvg(currentRates) ??
            rawStats.observedPlacementRate ??
            rawStats.actualPlacementRate ??
            null;

          const hasRealData =
            liveOutcomes > 0 ||
            liveMedian != null ||
            liveAvg != null ||
            liveRate != null ||
            Boolean(intel?.hasEnoughData);

          setStudentStats({
            hasEnoughData: hasRealData,
            emptyStateMessage: hasRealData ? null : 'Not enough verified student data yet.',
            sampleSize: liveOutcomes,
            verifiedStudentOutcomes: liveOutcomes,
            verifiedPackageRecords:
              intel?.verifiedPackageRecords ??
              reviewStats?.verifiedPackageRecords ??
              rawStats.verifiedPackageRecords ??
              liveOutcomes,
            placedVerifiedStudents:
              intel?.placedVerifiedStudents ??
              (liveRate ? Math.round((liveOutcomes * liveRate) / 100) : liveOutcomes),
            medianPackageLPA: liveMedian,
            averagePackageLPA: liveAvg,
            highestPackageLPA: liveHighest,
            observedPlacementRate: liveRate,
            actualPlacementRate: liveRate,
            isLowSample: liveOutcomes > 0 && liveOutcomes < 10,
            observedCoveragePercentage: intel?.observedCoveragePercentage || null,
            confidenceScore: hasRealData ? 90 : 0,
            verifiedReviewsCount: fetchedReviews.length,
          });
        }
      } catch (err) {
        // Safe fallback already pre-set
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchApiData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, college]);

  if (!isOpen || !college) return null;

  const officialRec = college.latestPlacementRecord || {};
  const officialMedian = officialRec.medianPackageLPA || null;
  const officialAvg = officialRec.averagePackageLPA || null;

  // Manage Overall Star Rating across all reviews
  const avgOverallRating = reviews.length > 0
    ? Number(
        (
          reviews.reduce(
            (acc, r) => acc + (Number(r.overallRating || r.ratings?.placementSupport || 5)),
            0
          ) / reviews.length
        ).toFixed(1)
      )
    : 4.5;

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmissionError('');
    if (!formReviewText.trim() || !formTitle.trim()) return;

    if (!user) {
      setSubmissionError('Please sign in to submit a review.');
      return;
    }

    if (!user.isCollegeVerified || user.collegeVerificationStatus !== 'verified') {
      setSubmissionError(
        'Only document-verified students can publish reviews and placement metrics under Verified Student Comments. Please verify your student ID in your profile first.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const parsedMedian = formMedianLPA ? parseFloat(formMedianLPA) : (studentStats?.medianPackageLPA || null);
      const parsedAvg = formAvgLPA ? parseFloat(formAvgLPA) : (studentStats?.averagePackageLPA || null);
      const parsedHighest = formHighestLPA ? parseFloat(formHighestLPA) : (studentStats?.highestPackageLPA || null);
      const parsedRate = formPlacementRate ? parseFloat(formPlacementRate) : (studentStats?.actualPlacementRate || null);

      const payload = {
        collegeId: college._id,
        graduationYear: parseInt(formYear, 10),
        branch: formBranch,
        title: formTitle,
        reviewText: formReviewText,
        pros: formPros,
        cons: formCons,
        overallRating: formOverallRating,
        isPseudonymous: true,
        verificationProofType: 'Student Roll ID & Institutional Email Verified',
        ratings: {
          placementSupport: formRatingPlacement || formOverallRating,
          internshipSupport: formRatingInternship || formOverallRating,
          teachingAcademics: formRatingAcademics || formOverallRating,
          infrastructure: formOverallRating,
          campusExperience: formOverallRating,
          careerPrep: formRatingPlacement || formOverallRating,
        },
        reportedStats: {
          medianPackageLPA: parsedMedian,
          averagePackageLPA: parsedAvg,
          highestPackageLPA: parsedHighest,
          actualPlacementRate: parsedRate,
        },
      };

      const res = await reviewApi.submitReview(payload);
      setSubmitSuccess(true);
      setShowSubmitForm(false);

      if (res.data?.data?.review) {
        const newReview = res.data.data.review;
        const updatedReviews = [newReview, ...reviews];
        setReviews(updatedReviews);

        // Re-aggregate studentStats live from verified reviews
        const medians = updatedReviews.map((r) => r.reportedStats?.medianPackageLPA).filter((v) => v != null);
        const avgs = updatedReviews.map((r) => r.reportedStats?.averagePackageLPA).filter((v) => v != null);
        const highests = updatedReviews.map((r) => r.reportedStats?.highestPackageLPA).filter((v) => v != null);
        const rates = updatedReviews.map((r) => r.reportedStats?.actualPlacementRate).filter((v) => v != null);

        setStudentStats((prev) => ({
          ...prev,
          hasEnoughData: true,
          sampleSize: updatedReviews.length,
          verifiedStudentOutcomes: updatedReviews.length,
          verifiedPackageRecords: Math.max(prev?.verifiedPackageRecords || 0, updatedReviews.length),
          medianPackageLPA: medians.length > 0 ? calcMedian(medians) : parsedMedian,
          averagePackageLPA: avgs.length > 0 ? calcAvg(avgs) : parsedAvg,
          highestPackageLPA: highests.length > 0 ? Math.max(...highests) : parsedHighest,
          actualPlacementRate: rates.length > 0 ? calcAvg(rates) : parsedRate,
          observedPlacementRate: rates.length > 0 ? calcAvg(rates) : parsedRate,
          isLowSample: updatedReviews.length < 10,
        }));

        if (onReviewSubmitted) onReviewSubmitted(newReview);
      }
    } catch (err) {
      setSubmissionError(
        err.response?.data?.message || err.message || 'Submission failed. Only document-verified students can contribute.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between relative border-b border-white/10">
          <div className="space-y-1.5 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Student Ground Truth
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200 text-[11px] font-medium">
                Session 2026–27
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
                {college.tierClassification?.tier || 'Tier 2'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {college.name}
            </h2>
            <p className="text-xs text-slate-300">
              {college.city}, {college.state} • Official disclosures cross-checked against independent verified student submissions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* STATS PROVIDED BY VERIFIED STUDENTS: 4 CORE BATCH BOXES (IMAGE 2 METRICS) */}
          {!studentStats?.hasEnoughData && reviews.length === 0 ? (
            /* TRUE INITIAL EMPTY STATE */
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Not enough verified student data yet.
                    </h3>
                    <p className="text-xs text-slate-500">
                      Independent intelligence requires moderator-approved offer letters or roll-number verified submissions.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitForm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Report First Batch Stats</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMethodologyModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Methodology</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* REAL VERIFIED DATA AVAILABLE: 4 RELEVANT METRIC BOXES MATCHING IMAGE 2 */
            <div className="space-y-3">
              {studentStats?.isLowSample && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Preliminary — small sample size:</span> Based on {studentStats?.verifiedStudentOutcomes || reviews.length} verified student outcome(s).
                  </div>
                </div>
              )}

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Student-Verified Batch Placement Reality
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                      {studentStats?.verifiedStudentOutcomes || reviews.length} Verified Outcom{(studentStats?.verifiedStudentOutcomes || reviews.length) === 1 ? 'e' : 'es'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMethodologyModal(true)}
                      className="text-xs text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Methodology</span>
                    </button>
                  </div>
                </div>

                {/* 4 BATCH METRIC BOXES MATCHING IMAGE 2 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Real Median (LPA)
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                      {studentStats?.medianPackageLPA != null ? `₹${studentStats.medianPackageLPA} LPA` : '—'}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Cohort Mathematical p50
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Real Average (LPA)
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                      {studentStats?.averagePackageLPA != null ? `₹${studentStats.averagePackageLPA} LPA` : '—'}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Verified Mean Compensation
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Highest Offer (LPA)
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
                      {studentStats?.highestPackageLPA != null ? `₹${studentStats.highestPackageLPA} LPA` : '—'}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Peak Verified Offer
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Placed Rate (%)
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      {studentStats?.observedPlacementRate ?? studentStats?.actualPlacementRate != null
                        ? `${studentStats.observedPlacementRate ?? studentStats.actualPlacementRate}%`
                        : '—'}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Observed Placement Rate
                    </span>
                  </div>
                </div>

                {officialMedian && (
                  <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between border-t border-slate-100">
                    <span>
                      Official College Disclosures: <strong>₹{officialMedian} LPA median</strong> {officialAvg ? `• ₹${officialAvg} LPA avg` : ''}
                    </span>
                    <span className="text-slate-400">Institutional Filings</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUCCESS MESSAGE IF SUBMITTED */}
          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>
                  <strong>Thank you!</strong> Your verified student review and placement numbers were submitted and added to this college's ground-truth report!
                </span>
              </div>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="text-emerald-700 hover:underline font-bold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* VERIFIED STUDENT COMMENTS HEADER & SUBMIT TOGGLE BUTTON */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-primary" />
                  <span>Verified Student Comments ({reviews.length})</span>
                </h3>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-xs font-bold text-amber-800">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{avgOverallRating} / 5 Overall</span>
                    <span className="text-[10px] text-amber-700 font-normal">({reviews.length} reviews)</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed reviews from students verified via institutional email and roll identification
              </p>
            </div>

            <button
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showSubmitForm ? 'Hide Review Form' : '+ Add Verified Comment & Stats'}</span>
            </button>
          </div>

          {/* SUBMISSION FORM (COLLAPSIBLE WITH VERIFICATION GATE) */}
          {showSubmitForm && !user && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <AlertCircle className="w-4 h-4 text-brand-primary" />
                <span>Sign In Required</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                You must be logged in with a verified institutional student account to publish verified reviews and ground-truth metrics.
              </p>
              <div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-navy-800 text-white font-bold rounded-xl text-xs transition"
                >
                  <span>Sign In / Register</span>
                </Link>
              </div>
            </div>
          )}

          {showSubmitForm && user && (!user.isCollegeVerified || user.collegeVerificationStatus !== 'verified') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm space-y-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Student Verification Required</span>
              </div>
              <div className="text-rose-800 space-y-2 leading-relaxed">
                <p>
                  Your student affiliation status is currently:{' '}
                  <strong className="uppercase px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">
                    {user.collegeVerificationStatus || 'Unverified'}
                  </strong>.
                </p>
                {user.collegeVerificationStatus === 'rejected' && (
                  <div className="p-3 bg-white/90 rounded-xl border border-rose-200 text-rose-900 text-xs">
                    <strong>Feedback from Lead Verifier:</strong>{' '}
                    <span>{user.collegeVerificationRejectionReason || 'The submitted student credentials did not meet institutional standards.'}</span>
                  </div>
                )}
                <p className="text-[11px] text-rose-700">
                  To protect public placement integrity, only <strong>document-verified students</strong> can publish comments under <em>Verified Student Comments</em> and contribute to college placement statistics.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Student ID in Profile</span>
                </Link>
              </div>
            </div>
          )}

          {showSubmitForm && user && user.isCollegeVerified && user.collegeVerificationStatus === 'verified' && (
            <form
              onSubmit={handleSubmitReview}
              className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">
                    Report Student Verified Placement Reality
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Student
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Submissions are confidential & roll-verified
                </span>
              </div>

              {submissionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}

              {/* OVERALL STAR RATING PICKER (PROVIDED BY STUDENT) */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Overall Placement &amp; Campus Star Rating (Provided by You) *
                  </label>
                  <span className="text-xs font-black text-amber-700 bg-white px-2.5 py-0.5 rounded-md border border-amber-200 shadow-2xs">
                    ⭐ {formOverallRating} of 5 Stars
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setFormOverallRating(star);
                          setFormRatingPlacement(star);
                          setFormRatingInternship(star);
                          setFormRatingAcademics(star);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-hidden"
                        title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-7 h-7 ${(hoverRating || formOverallRating) >= star ? 'fill-amber-400 text-amber-500 drop-shadow-xs' : 'text-slate-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium ml-1">
                    {formOverallRating === 5 && '🌟 Outstanding Reality'}
                    {formOverallRating === 4 && '👍 Very Good Experience'}
                    {formOverallRating === 3 && '😐 Average / Mixed Reality'}
                    {formOverallRating === 2 && '⚠️ Disappointing Placement'}
                    {formOverallRating === 1 && '⛔ Critical Reality / Warning'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Your Branch *</label>
                  <input
                    type="text"
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Graduation Batch Year *</label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="2027">2027 (Pre-final year)</option>
                    <option value="2026">2026 (Final year)</option>
                    <option value="2025">2025 (Recent Alum)</option>
                    <option value="2024">2024 (Alum)</option>
                  </select>
                </div>
              </div>

              {/* IMAGE 2 METRIC INPUTS: 4-COLUMN BOX */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Report Your Batch Ground Reality (Ground-Truth Check)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1 text-[11px]">Real Median (LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formMedianLPA}
                      onChange={(e) => setFormMedianLPA(e.target.value)}
                      placeholder="e.g. 7.5"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1 text-[11px]">Real Average (LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formAvgLPA}
                      onChange={(e) => setFormAvgLPA(e.target.value)}
                      placeholder="e.g. 8.3"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1 text-[11px]">Highest Offer (LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formHighestLPA}
                      onChange={(e) => setFormHighestLPA(e.target.value)}
                      placeholder="e.g. 67"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1 text-[11px]">Placed Rate (%)</label>
                    <input
                      type="number"
                      value={formPlacementRate}
                      onChange={(e) => setFormPlacementRate(e.target.value)}
                      placeholder="e.g. 81"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Review Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Bulk hiring numbers hide true median; strong for top coders"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Detailed Placement Reality &amp; Comments (Minimum 30 characters) *
                </label>
                <textarea
                  rows={3}
                  value={formReviewText}
                  onChange={(e) => setFormReviewText(e.target.value)}
                  placeholder="Explain the actual recruitment experience: companies visiting, shortlisting criteria, mass hiring packages, attendance leniency, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-800 font-semibold mb-1">Key Pros / Strengths</label>
                  <input
                    type="text"
                    value={formPros}
                    onChange={(e) => setFormPros(e.target.value)}
                    placeholder="e.g. High company footfall, modern labs"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-amber-800 font-semibold mb-1">Key Cons / Caveats</label>
                  <input
                    type="text"
                    value={formCons}
                    onChange={(e) => setFormCons(e.target.value)}
                    placeholder="e.g. Large batch size, strict shortlists"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Publish Verified Comment'}</span>
                </button>
              </div>
            </form>
          )}

          {/* REVIEWS LIST */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3">
                <p>No comments submitted for this college yet.</p>
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Be the first verified student to report!</span>
                </button>
              </div>
            ) : (
              reviews.map((rev, idx) => {
                const ratings = rev.ratings || {};
                const reviewOverall = rev.overallRating || ratings.placementSupport || 5;

                return (
                  <div
                    key={rev._id || idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-3"
                  >
                    {/* REVIEW TOP ROW */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {rev.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {rev.authorDisplayName || 'Verified Student'}
                          </span>
                          <span>•</span>
                          <span>{rev.branch || 'B.Tech'}</span>
                          {rev.graduationYear && (
                            <>
                              <span>•</span>
                              <span>Batch {rev.graduationYear}</span>
                            </>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1 text-[10px]">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            {rev.verificationProofType || 'Student Roll ID Verified'}
                          </span>
                        </div>
                      </div>

                      {/* STAR RATINGS PREVIEW - STUDENT PROVIDED OVERALL RATING */}
                      <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 text-xs font-black text-amber-800 shadow-2xs">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        <span>{Number(reviewOverall).toFixed(1)} / 5</span>
                      </div>
                    </div>

                    {/* REPORTED METRICS CARD - EXACT IMAGE 2 REPLICA */}
                    {rev.reportedStats && (
                      rev.reportedStats.medianPackageLPA != null ||
                      rev.reportedStats.averagePackageLPA != null ||
                      rev.reportedStats.highestPackageLPA != null ||
                      rev.reportedStats.actualPlacementRate != null
                    ) && (
                      <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-3 sm:p-3.5 my-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Student-Reported Batch Reality:</span>
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-semibold text-slate-500 block">Real Median</span>
                            <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                              {rev.reportedStats.medianPackageLPA != null ? `₹${rev.reportedStats.medianPackageLPA} LPA` : '—'}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-semibold text-slate-500 block">Real Average</span>
                            <span className="text-sm sm:text-base font-extrabold text-blue-700">
                              {rev.reportedStats.averagePackageLPA != null ? `₹${rev.reportedStats.averagePackageLPA} LPA` : '—'}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-semibold text-slate-500 block">Highest Offer</span>
                            <span className="text-sm sm:text-base font-extrabold text-purple-700">
                              {rev.reportedStats.highestPackageLPA != null ? `₹${rev.reportedStats.highestPackageLPA} LPA` : '—'}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-semibold text-slate-500 block">Placed Rate</span>
                            <span className="text-sm sm:text-base font-extrabold text-slate-900">
                              {rev.reportedStats.actualPlacementRate != null ? `${rev.reportedStats.actualPlacementRate}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* REVIEW TEXT */}
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {rev.reviewText}
                    </p>

                    {/* PROS & CONS */}
                    {(rev.pros || rev.cons) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        {rev.pros && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                            <span className="font-bold block text-[11px] text-emerald-800 mb-0.5">
                              ✓ Verified Strengths:
                            </span>
                            {rev.pros}
                          </div>
                        )}
                        {rev.cons && (
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
                            <span className="font-bold block text-[11px] text-amber-800 mb-0.5">
                              ⚠ Ground Reality Caveats:
                            </span>
                            {rev.cons}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Placement Reality Independent Student Audit Standards apply</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* METHODOLOGY MODAL */}
      <MethodologyExplanationModal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
      />
    </div>
  );
};
