import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collegeApi } from '../api/collegeApi';
import { placementApi } from '../api/placementApi';
import { internshipApi } from '../api/internshipApi';
import { DataBadge } from '../components/common/DataBadge';
import { TierBadge } from '../components/common/TierBadge';
import { InstitutionCategoryBadge } from '../components/common/InstitutionCategoryBadge';
import { ConfidenceScore } from '../components/common/ConfidenceScore';
import { SkeletonLoader, ErrorMessage } from '../components/common/FeedbackComponents';
import { formatSessionLabel } from '../utils/sessionHelper';
import {
  Building2,
  Calendar,
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  Briefcase,
  ShieldAlert,
  Info,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  FileText,
  X,
  Layers,
  ArrowRight,
  CheckSquare,
  Square,
  Clock,
  Eye,
  Scale,
  Landmark,
  RefreshCw,
  Search,
  AlertTriangle,
  Globe,
  Calculator,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

export const CollegeDetailPage = () => {
  const { slugOrId } = useParams();

  const [collegeData, setCollegeData] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [internshipData, setInternshipData] = useState(null);
  const [advRealityData, setAdvRealityData] = useState(null);

  // Official Placement Discovery state
  const [discoveryStatus, setDiscoveryStatus] = useState(null);
  const [discoveryPolling, setDiscoveryPolling] = useState(false);
  const [refreshingDiscovery, setRefreshingDiscovery] = useState(false);

  // Multi-session comparison state
  const [selectedCompareSessions, setSelectedCompareSessions] = useState([]);
  const [multiSessionComparison, setMultiSessionComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Source document modal state
  const [sourceModalData, setSourceModalData] = useState(null);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'official-discovery' | 'branches' | 'recruiters' | 'trends' | 'internships' | 'reviews'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDiscoveryStatus = async (collegeId) => {
    try {
      const res = await collegeApi.getDiscoveryStatus(collegeId);
      if (res.data?.success) {
        setDiscoveryStatus(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.warn('[Discovery Status Error]', err);
    }
    return null;
  };

  const handleTriggerDiscovery = async () => {
    if (!collegeData?.college?._id) return;
    setRefreshingDiscovery(true);
    try {
      await collegeApi.triggerDiscovery(collegeData.college._id);
      await fetchDiscoveryStatus(collegeData.college._id);
    } catch (err) {
      console.error('[Trigger Discovery Error]', err);
    } finally {
      setRefreshingDiscovery(false);
    }
  };

  useEffect(() => {
    const fetchCollegeInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await collegeApi.getCollegeBySlug(slugOrId);
        if (res.data?.success) {
          const { college, seasons } = res.data.data;
          setCollegeData(res.data.data);

          // Fetch discovery status immediately
          fetchDiscoveryStatus(college._id);

          if (seasons.length > 0) {
            const defaultSeason =
              seasons.find((s) => s.academicYear === '2023-2024') ||
              seasons.find((s) => s.academicYear === '2022-2023') ||
              seasons.find((s) => s.isCurrentSeason) ||
              seasons[0];
            setSelectedSeasonId(defaultSeason._id);
            await loadSeasonData(college._id, defaultSeason._id);
          } else {
            await loadSeasonData(college._id, null);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load college details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCollegeInfo();
  }, [slugOrId]);

  // Reactive polling for background placement discovery
  useEffect(() => {
    let timer;
    const currentStatus = discoveryStatus?.placementDiscovery?.status;
    if (currentStatus === 'in_progress' || currentStatus === 'pending') {
      setDiscoveryPolling(true);
      timer = setInterval(async () => {
        if (collegeData?.college?._id) {
          const updated = await fetchDiscoveryStatus(collegeData.college._id);
          if (
            updated?.placementDiscovery?.status === 'completed' ||
            updated?.placementDiscovery?.status === 'no_data_found' ||
            updated?.placementDiscovery?.status === 'failed'
          ) {
            setDiscoveryPolling(false);
            if (selectedSeasonId) {
              loadSeasonData(collegeData.college._id, selectedSeasonId);
            }
          }
        }
      }, 3500);
    } else {
      setDiscoveryPolling(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [discoveryStatus?.placementDiscovery?.status, collegeData?.college?._id, selectedSeasonId]);

  const loadSeasonData = async (collegeId, seasonId) => {
    try {
      const [analyticsRes, historyRes, internRes, advRealityRes] = await Promise.all([
        placementApi.getPlacementDashboard(collegeId, seasonId),
        placementApi.getHistoricalTrends(collegeId),
        internshipApi.getInternshipAnalytics(collegeId),
        placementApi.getAdvertisedVsReality(collegeId, { seasonId }).catch(() => null),
      ]);

      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.data);
      if (historyRes.data?.success) {
        const hData = historyRes.data.data;
        setHistoryData(hData);
        // Pre-select latest two sessions for multi-session comparison if not set
        if (hData?.sessionTimeline?.length >= 2 && selectedCompareSessions.length === 0) {
          const initial = [hData.sessionTimeline[0].academicYear, hData.sessionTimeline[1].academicYear];
          setSelectedCompareSessions(initial);
          fetchMultiSessionComparison(collegeId, initial);
        }
      }
      if (internRes.data?.success) setInternshipData(internRes.data.data);
      if (advRealityRes?.data?.success) setAdvRealityData(advRealityRes.data.data);
    } catch (err) {
      console.error('[Load Season Data Error]', err);
    }
  };

  const handleSeasonChange = (e) => {
    const newSeasonId = e.target.value;
    setSelectedSeasonId(newSeasonId);
    if (collegeData?.college?._id) {
      loadSeasonData(collegeData.college._id, newSeasonId);
    }
  };

  const fetchMultiSessionComparison = async (collegeId, sessionKeys) => {
    if (sessionKeys.length < 2) {
      setMultiSessionComparison(null);
      return;
    }
    setComparisonLoading(true);
    try {
      const res = await placementApi.compareSessions(collegeId, sessionKeys);
      if (res.data?.success) {
        setMultiSessionComparison(res.data.data);
      }
    } catch (err) {
      console.error('[Multi-Session Compare Error]', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  const toggleCompareSession = (sessionKey) => {
    let updated;
    if (selectedCompareSessions.includes(sessionKey)) {
      if (selectedCompareSessions.length <= 2) return; // Keep minimum 2
      updated = selectedCompareSessions.filter((s) => s !== sessionKey);
    } else {
      if (selectedCompareSessions.length >= 4) return; // Maximum 4
      updated = [...selectedCompareSessions, sessionKey];
    }
    setSelectedCompareSessions(updated);
    if (collegeData?.college?._id) {
      fetchMultiSessionComparison(collegeData.college._id, updated);
    }
  };

  const openSourceModal = (metricTitle, metricValue, docName, url, provNotes, date) => {
    setSourceModalData({
      metricTitle,
      metricValue,
      documentName: docName || provenance?.documentName || 'Official Annual Placement Report',
      sourceUrl: url || provenance?.sourceUrl,
      source: provenance?.primarySource || 'Official Report',
      verificationStatus: provenance?.verificationStatus || 'Platform-Audited',
      notes: provNotes || provenance?.verificationNotes,
      date: date || provenance?.lastCheckedDate || provenance?.lastUpdatedDate,
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SkeletonLoader count={3} />
      </div>
    );
  }

  if (error || !collegeData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <ErrorMessage message={error || 'College details not found.'} />
      </div>
    );
  }

  const { college, seasons } = collegeData;
  const headline = analytics?.headlineStats;
  const provenance = analytics?.provenance;
  const coverage = analytics?.metricsCoverage;

  const selectedSeason = seasons.find((s) => s._id === selectedSeasonId);
  const currentSessionLabel = selectedSeason
    ? formatSessionLabel(selectedSeason.academicYear)
    : 'Selected Session';

  const isCategoryA = college?.institutionCategory?.category === 'Category A: Premium Public' || ['IIT', 'NIT', 'IIIT'].includes(college?.campusType);
  const missingMetricText = isCategoryA ? 'Not reported' : 'Verified data not available';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <InstitutionCategoryBadge
                category={college.institutionCategory?.category || (isCategoryA ? 'Category A: Premium Public' : 'Category B: Private')}
                subCategory={college.institutionCategory?.subCategory || college.campusType}
                size="sm"
              />
              <TierBadge
                tier={college.tierClassification?.tier}
                rationale={college.tierClassification?.rationale}
              />
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                {college.campusType}
              </span>
              {college.nirfRanking?.engineeringRank && (
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                  NIRF Engineering #{college.nirfRanking.engineeringRank}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
              {college.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {college.about ||
                'Institute placement analytics tracked via NIRF submissions and verified student offer letters.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span>
                <strong>Location:</strong> {college.city}, {college.state}
              </span>
              <span>
                <strong>Accreditation:</strong> {college.accreditation}
              </span>
              {college.aicteApprovalOrAffiliation && (
                <span>
                  <strong>Affiliation:</strong> {college.aicteApprovalOrAffiliation}
                </span>
              )}
              {college.website && (
                <a
                  href={college.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-secondary flex items-center gap-1 hover:underline"
                >
                  <span>Official Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Institutional Historical Data Policy Banner (Requirement 1 & 2) */}
            {isCategoryA ? (
              <div className="p-3.5 rounded-2xl bg-purple-50/90 border border-purple-200 text-purple-950 text-xs flex items-start gap-3 mt-3">
                <Landmark className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-900">Category A: Premium Public Institution Policy</span>
                    <span className="text-[10px] bg-purple-200/70 text-purple-800 px-2 py-0.5 rounded-full font-semibold">IIT / NIT / IIIT Policy</span>
                  </div>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Historical placement records from 2018–19 to the current session are compiled from official annual reports, statutory filings, and NIRF disclosures. Older sessions with reliable records are included even when some metrics are missing. Unavailable metrics are explicitly marked as <strong>"Not reported"</strong> rather than estimated.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 text-xs flex items-start gap-3 mt-3">
                <ShieldAlert className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-900">Category B: Private Institution Policy</span>
                    <span className="text-[10px] bg-indigo-200/70 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Strict Session-Wise Verification</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Strict session isolation is enforced — data from different sessions is never commingled. General marketing claims are never accepted as confirmed placement outcomes. Unverified sessions are designated as <strong>"Verified data not available for this session"</strong> with zero interpolation.
                  </p>
                </div>
              </div>
            )}

            {/* Newly Established Banner */}
            {college.isNewlyEstablished && (
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 mt-3">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Newly Established Institution (Founded: {college.establishedYear}
                    {college.firstGraduatingBatchYear
                      ? ` • Inaugural Graduating Class: ${college.firstGraduatingBatchYear}`
                      : ''}
                    )
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This campus was founded recently and is actively building its industry placement
                    track record. All stats shown represent early cohort drives and student-submitted
                    verified outcomes.
                    {college.submissionNotes ? ` Student note: "${college.submissionNotes}"` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Automated Placement Discovery Banner */}
            {discoveryStatus?.placementDiscovery?.status === 'in_progress' || discoveryStatus?.placementDiscovery?.status === 'pending' ? (
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs flex items-start gap-3 mt-3 animate-pulse">
                <RefreshCw className="w-5 h-5 text-sky-600 animate-spin shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 text-sm">Placement Data Discovery in Progress</span>
                    <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-semibold">Background Crawler</span>
                  </div>
                  <p className="text-[11px] text-sky-800 leading-relaxed">
                    Automatically scanning official university portal ({college.website}). Crawling placement reports, status tables, and NIRF disclosures across academic sessions.
                  </p>
                </div>
              </div>
            ) : discoveryStatus?.placementDiscovery?.status === 'completed' ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-3 mt-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900 text-sm">Official Placement Data Discovered & Verified</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                        {discoveryStatus.officialRecords?.length || discoveryStatus.placementDiscovery.reportsFoundCount} Sessions Extracted
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('official-discovery')}
                        className="text-[11px] bg-emerald-700 text-white hover:bg-emerald-800 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Discovered Reports</span>
                      </button>
                      <button
                        onClick={handleTriggerDiscovery}
                        disabled={refreshingDiscovery}
                        className="text-[11px] bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshingDiscovery ? 'animate-spin' : ''}`} />
                        <span>Re-crawl</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Extracted from official institutional domain ({college.website}). All metrics preserved with direct source links.
                  </p>
                </div>
              </div>
            ) : discoveryStatus?.placementDiscovery?.status === 'no_data_found' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 mt-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-sm">Official Placement Data Could Not Be Discovered Automatically</span>
                    <button
                      onClick={handleTriggerDiscovery}
                      disabled={refreshingDiscovery}
                      className="text-[11px] bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshingDiscovery ? 'animate-spin' : ''}`} />
                      <span>Retry Discovery</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Official reports could not be found or verified on {college.website}. Student submissions or manual uploads will populate benchmarks.
                  </p>
                </div>
              </div>
            ) : discoveryStatus?.placementDiscovery?.status === 'failed' ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 mt-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 text-sm">Discovery Warning</span>
                    <button
                      onClick={handleTriggerDiscovery}
                      disabled={refreshingDiscovery}
                      className="text-[11px] bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshingDiscovery ? 'animate-spin' : ''}`} />
                      <span>Retry</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    {discoveryStatus.placementDiscovery?.message || 'Crawler error occurred while scanning official website.'}
                  </p>
                </div>
              </div>
            ) : college.website ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-primary" />
                  <span>Official Website: <strong>{college.website}</strong></span>
                </div>
                <button
                  onClick={handleTriggerDiscovery}
                  disabled={refreshingDiscovery}
                  className="px-3 py-1 bg-brand-primary text-white hover:bg-navy-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Discover Official Placement Data</span>
                </button>
              </div>
            ) : null}
          </div>

          {/* Session Selector & Actions */}
          <div className="flex flex-col sm:items-end gap-3 min-w-[220px]">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-brand-primary" />
                <span>Select Academic Session</span>
              </label>
              <select
                value={selectedSeasonId}
                onChange={handleSeasonChange}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800 shadow-xs focus:ring-2 focus:ring-brand-secondary"
              >
                {seasons.map((s) => (
                  <option key={s._id} value={s._id}>
                    Session {formatSessionLabel(s.academicYear)} ({s.seasonStatus})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Link
                to={`/roi-calculator?collegeId=${college._id}`}
                className="w-full sm:w-auto px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Loan & ROI Simulator</span>
              </Link>
              <Link
                to={`/community?collegeId=${college._id}`}
                className="w-full sm:w-auto px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-xl border border-orange-200 transition text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Campus Q&A</span>
              </Link>
              <Link
                to="/submit-offer"
                className="w-full sm:w-auto px-3.5 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Submit Offer</span>
              </Link>
            </div>
          </div>
        </div>

        {/* PROMINENT SESSION BANNER & DATA COVERAGE INDICATOR (Requirement 2 & 7) */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Viewing Session {currentSessionLabel}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 font-semibold text-[10px]">
                {selectedSeason?.seasonStatus || 'Concluded Session'}
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {provenance?.documentName
                ? `Source: ${provenance.documentName}`
                : provenance?.verificationNotes || 'Records audited against official reports and student documents.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {/* Metric Coverage Indicator */}
            {coverage && (
              <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-slate-700 pl-3 md:pl-0 md:pr-4">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Data Coverage</span>
                <span className="font-bold text-emerald-400 text-xs">
                  {coverage.verifiedMetricsCount} of {coverage.totalTrackedMetrics} Verified Metrics ({coverage.coveragePercentage}%)
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <DataBadge status={provenance?.verificationStatus || 'Unverified'} size="sm" />
              {provenance?.sourceUrl && (
                <button
                  onClick={() =>
                    openSourceModal(
                      'Session Overview',
                      currentSessionLabel,
                      provenance.documentName,
                      provenance.sourceUrl,
                      provenance.verificationNotes,
                      provenance.lastCheckedDate
                    )
                  }
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-slate-200 text-[11px] font-medium flex items-center gap-1 transition"
                >
                  <FileText className="w-3 h-3 text-brand-secondary" />
                  <span>View Source</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold space-x-2">
        {[
          { id: 'overview', label: `Placement KPIs (${currentSessionLabel})` },
          {
            id: 'official-discovery',
            label: `Discovered Official Reports (${discoveryStatus?.officialRecords?.length || discoveryStatus?.placementDiscovery?.reportsFoundCount || 0})`,
          },
          { id: 'tit-for-tat', label: 'Advertised vs. Reality (Tit-for-Tat)' },
          { id: 'branches', label: 'Branch Breakdown' },
          { id: 'recruiters', label: 'Recruiters & Drives' },
          { id: 'trends', label: 'Historical Trends & Multi-Session Compare' },
          { id: 'internships', label: 'Internships' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 rounded-t-xl transition whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-brand-primary text-brand-primary bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & SALARY DISTRIBUTION */}
      {activeTab === 'overview' &&
        (analytics?.hasVerifiedData === false || !headline ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Verified data not available for this session.
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              We enforce strict evidence validation. No verified placement records or student offer letters have been
              approved for academic session <strong>{currentSessionLabel}</strong> yet. Select a different session or submit
              confidential documentation.
            </p>

            {discoveryStatus?.officialRecords?.length > 0 && (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 max-w-lg mx-auto text-left">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{discoveryStatus.officialRecords.length} official reports</strong> discovered for this university.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('official-discovery')}
                  className="px-3 py-1 bg-emerald-700 text-white font-semibold rounded-lg text-xs hover:bg-emerald-800 transition shrink-0 cursor-pointer"
                >
                  View Reports
                </button>
              </div>
            )}

            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/submit-offer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-navy-800 transition shadow-sm"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Submit Offer Letter for Verification</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* KEY HEADLINE METRICS GRID (Requirement 2 & 7) */}
            {headline && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Median Package */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 relative group">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Median Package</span>
                    <button
                      onClick={() =>
                        openSourceModal(
                          'Median Package (p50)',
                          headline.medianPackageLPA ? `${headline.medianPackageLPA} LPA` : missingMetricText,
                          provenance?.documentName,
                          provenance?.sourceUrl,
                          'Calculated as the 50th percentile of cohort compensation.'
                        )
                      }
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Source</span>
                    </button>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-brand-primary">
                    {headline.medianPackageLPA ? `${headline.medianPackageLPA} LPA` : missingMetricText}
                  </div>
                  <p className="text-[11px] text-slate-400">50th percentile of cohort compensation</p>
                </div>

                {/* Average Package */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Average Package</span>
                    <button
                      onClick={() =>
                        openSourceModal(
                          'Average Package (Mean CTC)',
                          headline.averagePackageLPA ? `${headline.averagePackageLPA} LPA` : missingMetricText,
                          provenance?.documentName,
                          provenance?.sourceUrl,
                          `Peak package recorded: ${headline.highestPackageLPA ? `${headline.highestPackageLPA} LPA` : missingMetricText}`
                        )
                      }
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Source</span>
                    </button>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                    {headline.averagePackageLPA ? `${headline.averagePackageLPA} LPA` : missingMetricText}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Highest package: {headline.highestPackageLPA ? `${headline.highestPackageLPA} LPA` : missingMetricText}
                  </p>
                </div>

                {/* Unique Placed vs Total Offers */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Unique Placed</span>
                    <button
                      onClick={() =>
                        openSourceModal(
                          'Unique Placed Students',
                          headline.uniqueStudentsPlaced,
                          provenance?.documentName,
                          provenance?.sourceUrl,
                          `Total offers: ${headline.totalJobOffers}. Unique students placed reflects distinct heads, avoiding double-counting multiple offers.`
                        )
                      }
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Source</span>
                    </button>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                    {headline.uniqueStudentsPlaced}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Total job offers: <strong>{headline.totalJobOffers}</strong> (Gross count)
                  </p>
                </div>

                {/* Placement Percentage */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Placement %</span>
                    {headline.placementRate?.canCalculate ? (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Valid Denominator
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        Denominator Missing
                      </span>
                    )}
                  </div>

                  {headline.placementRate?.canCalculate ? (
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {headline.placementRate.percentage}%
                    </div>
                  ) : (
                    <div className="text-base font-bold text-amber-600">Undisclosed Denominator</div>
                  )}

                  <p className="text-[10px] text-slate-500 leading-tight">
                    {headline.placementRate?.reason}
                  </p>
                </div>
              </div>
            )}

            {/* SALARY DISTRIBUTION & DATA INTEGRITY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Annual CTC Distribution ({currentSessionLabel})
                    </h3>
                    <p className="text-xs text-slate-500">Number of offers across salary brackets for this session</p>
                  </div>
                  <DataBadge status={provenance?.verificationStatus} size="xs" />
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.salaryDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="rangeLabel" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="offerCount" name="Total Offers" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Integrity Telemetry Card */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-bold text-base text-slate-900">Session Data Integrity</h3>

                  {analytics?.dataQualityIndicators && (
                    <ConfidenceScore
                      score={analytics.dataQualityIndicators.score}
                      tier={analytics.dataQualityIndicators.tier}
                      factors={analytics.dataQualityIndicators.factors}
                    />
                  )}

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Graduating Students:</span>
                      <span className="font-semibold text-slate-800">
                        {headline?.totalGraduatingStudents || 'Undisclosed'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Eligible Students:</span>
                      <span className="font-semibold text-slate-800">
                        {headline?.totalEligibleStudents || 'Undisclosed by Institute'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Unique Recruiters:</span>
                      <span className="font-semibold text-slate-800">
                        {headline?.uniqueRecruitersCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Last Checked Date:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(provenance?.lastCheckedDate || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold block">Methodology Guarantee:</span>
                  Never conflates total offers with placed individuals. Missing student records reflect unsubmitted
                  documents, NOT unplaced students.
                </div>
              </div>
            </div>
          </div>
        ))}

      {/* TAB: OFFICIAL DISCOVERED REPORTS (MULTI-SESSION & DEDUPLICATED) */}
      {activeTab === 'official-discovery' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-xl font-extrabold text-navy-950">
                    Official Discovered Placement Reports
                  </h2>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    Official University Crawler
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  These records were automatically discovered and extracted directly from the official university website domain (<span className="font-mono text-slate-700">{college.website}</span>). Each record is strictly isolated to its academic session and backed by the exact official document or portal link. Missing metrics are labeled as <strong>"Not disclosed"</strong> and never estimated or copied.
                </p>
              </div>

              <button
                onClick={handleTriggerDiscovery}
                disabled={refreshingDiscovery}
                className="px-4 py-2.5 bg-brand-primary hover:bg-navy-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingDiscovery ? 'animate-spin' : ''}`} />
                <span>Re-crawl Official Site</span>
              </button>
            </div>

            {/* Discovery Crawl Metadata */}
            {discoveryStatus?.placementDiscovery && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Discovery Status</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {discoveryStatus.placementDiscovery.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Pages Scanned</span>
                  <span className="font-bold text-slate-800">
                    {discoveryStatus.placementDiscovery.pagesCheckedCount || 1} Official Pages
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Unique Sessions</span>
                  <span className="font-bold text-emerald-600">
                    {discoveryStatus.officialRecords?.length || discoveryStatus.placementDiscovery.uniqueSessionsFound?.length || 0} Sessions
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Last Audited</span>
                  <span className="font-bold text-slate-800">
                    {discoveryStatus.placementDiscovery.lastRunAt
                      ? new Date(discoveryStatus.placementDiscovery.lastRunAt).toLocaleDateString()
                      : 'Recently'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Discovered Multi-Session Cards Grid */}
          {discoveryStatus?.officialRecords?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoveryStatus.officialRecords.map((rec, idx) => {
                const sessionLabel = formatSessionLabel(rec.academicSession || rec.reportingYear || rec.academicYear);
                return (
                  <div
                    key={rec._id || idx}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-5 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-navy-950">
                              Session {sessionLabel}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={rec.documentName}>
                            {rec.documentName || `${college.shortName || college.name} Official Placement Disclosure`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Officially Disclosed
                        </span>
                      </div>

                      {/* Packages Grid */}
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Highest Package</span>
                          <span className="text-base font-extrabold text-brand-primary">
                            {rec.highestPackageLPA != null ? `${rec.highestPackageLPA} LPA` : <span className="text-xs text-slate-400 font-normal">Not disclosed</span>}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Average Package</span>
                          <span className="text-base font-extrabold text-slate-800">
                            {rec.averagePackageLPA != null ? `${rec.averagePackageLPA} LPA` : <span className="text-xs text-slate-400 font-normal">Not disclosed</span>}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Median Package</span>
                          <span className="text-base font-extrabold text-slate-800">
                            {rec.medianPackageLPA != null ? `${rec.medianPackageLPA} LPA` : <span className="text-xs text-slate-400 font-normal">Not disclosed</span>}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Lowest Package</span>
                          <span className="text-base font-extrabold text-slate-700">
                            {rec.lowestPackageLPA != null ? `${rec.lowestPackageLPA} LPA` : <span className="text-xs text-slate-400 font-normal">Not disclosed</span>}
                          </span>
                        </div>
                      </div>

                      {/* Counts */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Offers / Placed</span>
                          <span className="font-semibold text-slate-700">
                            {rec.totalJobOffers ?? rec.uniqueStudentsPlaced ?? <span className="text-slate-400 text-[11px]">Not disclosed</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Recruiting Companies</span>
                          <span className="font-semibold text-slate-700">
                            {rec.uniqueRecruitersCount ?? <span className="text-slate-400 text-[11px]">Not disclosed</span>}
                          </span>
                        </div>
                      </div>

                      {/* Recruiter Chips */}
                      {rec.topRecruiters?.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Major Recruiters Disclosed</span>
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                            {rec.topRecruiters.slice(0, 10).map((r, rIdx) => {
                              const name = typeof r === 'string' ? r : r.companyName;
                              return (
                                <span
                                  key={rIdx}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200"
                                >
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Strictly Isolated to {sessionLabel}
                      </span>
                      {rec.sourceUrl ? (
                        <a
                          href={rec.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition"
                        >
                          <span>View Official Source</span>
                          <ExternalLink className="w-3 h-3 text-brand-primary" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Official Portal Source</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                No official placement reports extracted yet.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {discoveryStatus?.placementDiscovery?.message ||
                  'The crawler automatically looks for official placement pages, status tables, and annual disclosures. Click below to begin extraction.'}
              </p>
              <button
                onClick={handleTriggerDiscovery}
                disabled={refreshingDiscovery}
                className="px-5 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-navy-800 transition inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>Run Automated Discovery</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: TIT-FOR-TAT ADVERTISED VS VERIFIED COMPARISON (Requirement 3) */}
      {activeTab === 'tit-for-tat' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Tit-for-Tat Verification Engine ({currentSessionLabel})</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Advertised Claims vs. Independently Verified Reality
                </h3>
                <p className="text-xs text-slate-500 max-w-2xl mt-1">
                  Comparing like-with-like for academic session <strong>{currentSessionLabel}</strong>. Strict session isolation enforced — unverified marketing claims are separated from confirmed placement outcomes.
                </p>
              </div>

              <InstitutionCategoryBadge
                category={college.institutionCategory?.category || (isCategoryA ? 'Category A: Premium Public' : 'Category B: Private')}
                subCategory={college.institutionCategory?.subCategory || college.campusType}
                size="md"
              />
            </div>

            {/* Like-For-Like Comparison Table */}
            {advRealityData?.titForTatComparison ? (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Placement Metric</th>
                        <th className="py-3 px-4">Direct from Official College Site</th>
                        <th className="py-3 px-4">Student Given Verified Reality</th>
                        <th className="py-3 px-4">Difference / Delta</th>
                        <th className="py-3 px-4">Verification Status</th>
                        <th className="py-3 px-4">Comparability Analysis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {advRealityData.titForTatComparison.likeForLikeComparisons.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{row.metric}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {row.advertised !== null ? `${row.advertised} ${row.unit}` : <span className="text-slate-400 italic">{missingMetricText}</span>}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-emerald-700">
                            {row.verified !== null ? `${row.verified} ${row.unit}` : <span className="text-slate-400 italic">Verified data not available</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            {row.canCompare && row.difference !== null ? (
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                row.difference < 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {row.difference > 0 ? `+${row.difference}` : row.difference} {row.unit}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Non-comparable</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <DataBadge
                              status={row.verified !== null ? 'Independently verified' : (row.advertised !== null ? 'Officially reported' : 'Unverified')}
                              size="xs"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs">
                            {row.mismatchReason ? (
                              <span className="text-amber-700 font-medium">{row.mismatchReason}</span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Direct like-for-like pair</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Guardrails and Limitations Notices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1">
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Highest vs Median Incomparability Guardrail</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      If the institution advertises its highest peak package but reliable evidence only provides the median package, they are NOT compared directly. Comparing an outlier peak against a central median is statistically invalid.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fairness & Zero Extrapolation Guarantee</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Missing student records reflect voluntary self-reporting gaps, NOT unplaced students. Claims are never labeled as misleading without conclusive evidence.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">Source Documentation:</span>
                    <span className="text-slate-600 ml-1.5">
                      {advRealityData.titForTatComparison.sources.advertisedDocumentName || 'Official Annual Report'}
                    </span>
                  </div>
                  {advRealityData.titForTatComparison.sources.advertisedSourceUrl && (
                    <a
                      href={advRealityData.titForTatComparison.sources.advertisedSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-secondary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>View Official Source File</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl space-y-2">
                <Info className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">No verified comparative data available for session {currentSessionLabel}.</p>
                <p className="text-slate-500 max-w-md mx-auto">
                  Tit-for-tat comparison requires both an official report and verified student offer letters for the exact same session.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BRANCH BREAKDOWN */}
      {activeTab === 'branches' &&
        ((analytics?.branchBreakdown || []).length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">
              Verified branch-wise placement data not available for this session.
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Department-specific metrics will appear once official branch-wise reports are corroborated.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Branch-Wise Placement Outcomes</h3>
                <p className="text-xs text-slate-500">
                  Outcomes across departments for session {currentSessionLabel}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Eligible Students</th>
                    <th className="py-3 px-4">Unique Placed</th>
                    <th className="py-3 px-4">Total Offers</th>
                    <th className="py-3 px-4">Median Package</th>
                    <th className="py-3 px-4">Average Package</th>
                    <th className="py-3 px-4">Highest Package</th>
                    <th className="py-3 px-4">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(analytics?.branchBreakdown || []).map((branch, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{branch.departmentName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{branch.departmentCode}</td>
                      <td className="py-3.5 px-4 text-slate-600">{branch.eligibleStudents ?? 'Undisclosed'}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">{branch.uniqueStudentsPlaced}</td>
                      <td className="py-3.5 px-4 text-slate-600">{branch.totalOffers}</td>
                      <td className="py-3.5 px-4 font-bold text-brand-primary">
                        {branch.medianPackageLPA ? `${branch.medianPackageLPA} LPA` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {branch.averagePackageLPA ? `${branch.averagePackageLPA} LPA` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">
                        {branch.highestPackageLPA ? `${branch.highestPackageLPA} LPA` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <DataBadge status={branch.verificationStatus} size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* TAB 3: RECRUITERS & DRIVES */}
      {activeTab === 'recruiters' &&
        ((analytics?.topRecruiters || []).length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">
              No verified recruiter data available yet for session {currentSessionLabel}.
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Verified recruiting companies will appear after student offer letters or official reports are corroborated.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Key Recruiting Companies ({currentSessionLabel})
              </h3>
              <p className="text-xs text-slate-500">Verified hiring partners sorted by offer volume</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {(analytics?.topRecruiters || []).map((recruiter, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{recruiter.companyName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-700">
                      {recruiter.tierCategory}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
                    <span>
                      Offers: <strong className="text-slate-900">{recruiter.offersCount}</strong>
                    </span>
                    <span>
                      Max Package: <strong className="text-emerald-600">{recruiter.highestLPA} LPA</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* TAB 4: HISTORICAL TRENDS & MULTI-SESSION COMPARISON (Requirement 1, 3, 4, 7) */}
      {activeTab === 'trends' && (
        <div className="space-y-8">
          {/* 1. TIMELINE NAVIGATION PILLS (2018-19 to Current) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span>Academic Session Timeline (2018–19 to Present)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select any session to view its verified outcomes, or check sessions below to compare
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {historyData?.verifiedSessionsCount || 0} of {historyData?.totalSessionsTracked || 0} Sessions Verified
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
              {historyData?.chronologicalTimeline?.map((item) => {
                const isSelected = selectedSeason?.academicYear === item.academicYear;
                return (
                  <button
                    key={item.seasonId}
                    onClick={() => {
                      setSelectedSeasonId(item.seasonId);
                      loadSeasonData(college._id, item.seasonId);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                      isSelected
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                        : item.hasVerifiedData
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.hasVerifiedData ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <span>{item.displaySession}</span>
                    {item.seasonStatus === 'Ongoing' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800">Ongoing</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. TIME-SERIES CHARTS (Showing true gaps, no misleading line connections) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Package Progression Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Package Progression (2018–19 to Present)</h3>
                <p className="text-xs text-slate-500">
                  Median (p50), Average, and Peak compensation in LPA. Data gaps represent unverified sessions.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData?.charts?.compensationTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="session" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit=" LPA" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      formatter={(val) => (val !== null ? `${val} LPA` : 'Data Not Available')}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="medianLPA"
                      name="Median CTC (LPA)"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="averageLPA"
                      name="Average CTC (LPA)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="highestLPA"
                      name="Peak CTC (LPA)"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Note: Line breaks indicate academic sessions with no verified placement reports available.
              </p>
            </div>

            {/* Placement Rate & Cohort Trend */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Placement Percentage & Headcounts</h3>
                <p className="text-xs text-slate-500">
                  Percentage placed where eligible denominator was disclosed.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData?.charts?.placementRateTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="session" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      formatter={(val) => (val !== null ? `${val}%` : 'Denominator Undisclosed')}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="placementRate"
                      name="Placement Rate (%)"
                      stroke="#059669"
                      strokeWidth={3}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Only computed when institute explicitly reported total eligible candidate headcounts.
              </p>
            </div>
          </div>

          {/* 3. MULTI-SESSION SIDE-BY-SIDE COMPARISON (Requirement 3 & 4) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-primary" />
                  <span>Multi-Session Side-by-Side Comparison</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select 2 to 4 academic sessions to evaluate exact year-over-year progression and deltas
                </p>
              </div>

              {/* Session check badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {historyData?.chronologicalTimeline?.map((item) => {
                  const isChecked = selectedCompareSessions.includes(item.academicYear);
                  return (
                    <button
                      key={item.seasonId}
                      onClick={() => toggleCompareSession(item.academicYear)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                        isChecked
                          ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{item.displaySession}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comparability Notice */}
            {multiSessionComparison?.comparabilityNotice && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{multiSessionComparison.comparabilityNotice}</span>
              </div>
            )}

            {/* Comparison Matrix Table */}
            {multiSessionComparison?.comparedSessions?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Metric</th>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <th key={s.seasonId} className="py-3 px-4 font-bold text-slate-900">
                          {s.displaySession}
                        </th>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((d, idx) => (
                        <th key={idx} className="py-3 px-4 text-purple-700 font-bold bg-purple-50/50">
                          Δ {d.fromSession} → {d.toSession}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Median Package */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-900">Median Package (p50)</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 font-extrabold text-brand-primary">
                          {s.advertised?.medianPackageLPA
                            ? `${s.advertised.medianPackageLPA} LPA`
                            : s.verified?.medianPackageLPA
                            ? `${s.verified.medianPackageLPA} LPA (Verified)`
                            : 'Not Available'}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((d, idx) => (
                        <td key={idx} className="py-3 px-4 font-bold bg-purple-50/30">
                          {d.medianChangeLPA !== null ? (
                            <span
                              className={
                                d.medianChangeLPA >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }
                            >
                              {d.medianChangeLPA >= 0 ? '+' : ''}
                              {d.medianChangeLPA} LPA ({d.medianGrowthPercent}%)
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Average Package */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-800">Average Package (Mean)</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 text-slate-800 font-medium">
                          {s.advertised?.averagePackageLPA
                            ? `${s.advertised.averagePackageLPA} LPA`
                            : s.verified?.averagePackageLPA
                            ? `${s.verified.averagePackageLPA} LPA`
                            : 'Not Available'}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((_, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-400 bg-purple-50/30">—</td>
                      ))}
                    </tr>

                    {/* Peak Package */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-800">Highest Package</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 text-slate-900 font-semibold">
                          {s.advertised?.highestPackageLPA
                            ? `${s.advertised.highestPackageLPA} LPA`
                            : 'Not Available'}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((_, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-400 bg-purple-50/30">—</td>
                      ))}
                    </tr>

                    {/* Placement Percentage */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-800">Placement Rate (%)</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 font-semibold text-emerald-700">
                          {s.advertised?.placementRatePercentage !== null &&
                          s.advertised?.placementRatePercentage !== undefined
                            ? `${s.advertised.placementRatePercentage}%`
                            : 'Undisclosed Denominator'}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((d, idx) => (
                        <td key={idx} className="py-3 px-4 font-bold bg-purple-50/30">
                          {d.placementRateDeltaPoints !== null ? (
                            <span
                              className={
                                d.placementRateDeltaPoints >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }
                            >
                              {d.placementRateDeltaPoints >= 0 ? '+' : ''}
                              {d.placementRateDeltaPoints}% pts
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Unique Students Placed */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600">Unique Students Placed</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 font-medium text-slate-800">
                          {s.advertised?.uniqueStudentsPlaced ?? s.verified?.uniqueStudentsPlaced ?? 'N/A'}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((_, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-400 bg-purple-50/30">—</td>
                      ))}
                    </tr>

                    {/* Total Eligible */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600">Reported Eligible Cohort</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 text-slate-600">
                          {s.advertised?.totalEligibleStudents ?? 'Undisclosed'}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((_, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-400 bg-purple-50/30">—</td>
                      ))}
                    </tr>

                    {/* Recruiting Companies */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600">Recruiting Companies</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 text-slate-700">
                          {s.advertised?.recruitingCompaniesCount ?? s.verified?.recruitingCompaniesCount ?? 'N/A'}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((_, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-400 bg-purple-50/30">—</td>
                      ))}
                    </tr>

                    {/* Primary Source Document */}
                    <tr className="hover:bg-slate-50/60 bg-slate-50/40">
                      <td className="py-3 px-4 font-bold text-slate-700">Source Document</td>
                      {multiSessionComparison.comparedSessions.map((s) => (
                        <td key={s.seasonId} className="py-3 px-4 text-slate-600">
                          {s.advertised?.documentName ? (
                            <span className="truncate block max-w-[180px] font-medium text-slate-800" title={s.advertised.documentName}>
                              {s.advertised.documentName}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Not Available</span>
                          )}
                        </td>
                      ))}
                      {multiSessionComparison.sessionDeltas?.map((_, idx) => (
                        <td key={idx} className="py-3 px-4 bg-purple-50/30 text-slate-400">—</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: INTERNSHIPS */}
      {activeTab === 'internships' &&
        (!internshipData?.hasVerifiedData || internshipData?.verifiedRecordsCount === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">No verified internship data available yet.</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Internship stipends and PPO outcomes are only published after students submit valid internship offer
              letters or completion certificates.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {internshipData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Verified Internship Records</span>
                  <div className="text-2xl font-extrabold text-brand-primary">{internshipData.verifiedRecordsCount}</div>
                  <p className="text-[11px] text-slate-400">Total submitted: {internshipData.totalRecords}</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Median Monthly Stipend</span>
                  <div className="text-2xl font-extrabold text-emerald-600">
                    ₹{internshipData.stipendSummary.medianMonthlyStipendINR?.toLocaleString('en-IN') || '0'} / mo
                  </div>
                  <p className="text-[11px] text-slate-400">Paid positions: {internshipData.stipendSummary.paidCount}</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs text-slate-500 font-medium">PPO Conversion Rate</span>
                  <div className="text-2xl font-extrabold text-purple-600">
                    {internshipData.ppoMetrics.ppoConversionRatePercentage !== null
                      ? `${internshipData.ppoMetrics.ppoConversionRatePercentage}%`
                      : 'Undisclosed'}
                  </div>
                  <p className="text-[11px] text-slate-400">Where evaluated candidate denominator exists</p>
                </div>
              </div>
            )}
          </div>
        ))}

      {/* SOURCE DOCUMENT MODAL (Requirement 5 & 7) */}
      {sourceModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSourceModalData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-brand-primary">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Source Documentation Audit</span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{sourceModalData.metricTitle}</h3>
              <p className="text-xl font-extrabold text-brand-primary mt-1">{sourceModalData.metricValue}</p>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-semibold block">Document Title / Publication:</span>
                <span className="font-bold text-slate-800">{sourceModalData.documentName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Primary Sourcing:</span>
                <span className="text-slate-800">{sourceModalData.source}</span>
              </div>
              {sourceModalData.sourceUrl && (
                <div>
                  <span className="text-slate-500 font-semibold block">Source Verification Link:</span>
                  <a
                    href={sourceModalData.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium break-all"
                  >
                    <span>{sourceModalData.sourceUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Audit Status:</span>
                <DataBadge status={sourceModalData.verificationStatus} size="xs" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Verified / Checked:</span>
                <span className="font-semibold text-slate-700">
                  {new Date(sourceModalData.date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {sourceModalData.notes && (
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                Audit note: "{sourceModalData.notes}"
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={() => setSourceModalData(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
              >
                Close Verification Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeDetailPage;
