import React, { useState, useEffect } from 'react';
import { comparisonApi } from '../api/comparisonApi';
import { collegeApi } from '../api/collegeApi';
import { DataBadge } from '../components/common/DataBadge';
import { TierBadge } from '../components/common/TierBadge';
import { SkeletonLoader, ErrorMessage } from '../components/common/FeedbackComponents';
import { FALLBACK_TOP_50_COLLEGES, FALLBACK_CORE_COLLEGES } from '../data/fallbackData';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  TrendingUp,
  Award,
  Building,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

export const CollegeComparisonPage = () => {
  const [allColleges, setAllColleges] = useState([]);
  const [selectedCollegeIds, setSelectedCollegeIds] = useState([]);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [methodologyNotes, setMethodologyNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    collegeApi.getColleges({ limit: 50 }).then((res) => {
      const cols = (res.data?.success && res.data.data.colleges?.length > 0)
        ? res.data.data.colleges
        : [...FALLBACK_CORE_COLLEGES, ...FALLBACK_TOP_50_COLLEGES];
      setAllColleges(cols);
      // Pre-select top 2 for instant comparison
      if (cols.length >= 2) {
        const initial = [cols[0]._id, cols[1]._id];
        setSelectedCollegeIds(initial);
        runComparison(initial);
      }
    }).catch(() => {
      const cols = [...FALLBACK_CORE_COLLEGES, ...FALLBACK_TOP_50_COLLEGES];
      setAllColleges(cols);
      if (cols.length >= 2) {
        const initial = [cols[0]._id, cols[1]._id];
        setSelectedCollegeIds(initial);
        runComparison(initial);
      }
    });
  }, []);

  const runComparison = async (ids) => {
    if (ids.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await comparisonApi.compareColleges(ids);
      if (res.data?.success) {
        setComparisonResults(res.data.data.comparisons);
        setMethodologyNotes(res.data.data.methodologyDifferences || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate comparison matrix.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCollege = (colId) => {
    let updated;
    if (selectedCollegeIds.includes(colId)) {
      if (selectedCollegeIds.length <= 2) return; // Keep minimum 2
      updated = selectedCollegeIds.filter((id) => id !== colId);
    } else {
      if (selectedCollegeIds.length >= 4) return; // Maximum 4
      updated = [...selectedCollegeIds, colId];
    }
    setSelectedCollegeIds(updated);
    runComparison(updated);
  };

  // Prepare chart comparison data
  const chartData = (comparisonResults || []).map((c) => ({
    name: c.college.shortName || c.college.name,
    median: c.analytics?.medianPackageLPA || 0,
    average: c.analytics?.averagePackageLPA || 0,
    highest: c.analytics?.highestPackageLPA || 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          <span>Multi-Institute Benchmarking</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
          Objective College Comparison
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
          Compare up to 4 colleges side-by-side. Our platform highlights variances in reporting methodologies and flags undisclosed denominators.
        </p>
      </div>

      {/* College Selector Chips */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Select Colleges to Compare (2 to 4):</span>
          <span className="text-slate-500">{selectedCollegeIds.length} / 4 Selected</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allColleges.map((col) => {
            const isSelected = selectedCollegeIds.includes(col._id);
            return (
              <button
                key={col._id}
                onClick={() => handleToggleCollege(col._id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isSelected
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{col.shortName || col.name}</span>
                {isSelected ? <X className="w-3 h-3 ml-1" /> : <Plus className="w-3 h-3 ml-1 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* METHODOLOGY WARNING / VARIANCE BANNER */}
      {methodologyNotes.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Methodology & Transparency Variance Notices</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-800 leading-relaxed pl-1 text-[11px]">
            {methodologyNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <SkeletonLoader count={2} />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : !comparisonResults ? null : (
        <div className="space-y-8">
          {/* SIDE-BY-SIDE MATRIX TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="py-4 px-6 w-1/4 font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                      Benchmark Dimension
                    </th>
                    {comparisonResults.map((c, i) => (
                      <th key={i} className="py-4 px-6 font-bold text-slate-900 text-sm">
                        <div>{c.college.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 font-normal text-xs text-slate-500">
                          <TierBadge tier={c.college.tierClassification?.tier} />
                          <span>{c.college.city}</span>
                          {c.season?.academicYear && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {c.season.academicYear}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* Reporting Source */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">Reporting Framework</td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6">
                        <span className="font-medium text-slate-800">{c.analytics?.reportingSource || 'Initial filing'}</span>
                        <div className="pt-0.5">
                          <DataBadge status={c.analytics?.verificationStatus} size="xs" />
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Median Package */}
                  <tr className="hover:bg-slate-50/50 bg-blue-50/20">
                    <td className="py-3.5 px-6 font-bold text-brand-primary">Median Package (50th %ile)</td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6">
                        <span className="text-base font-extrabold text-brand-primary">
                          {c.analytics?.medianPackageLPA
                            ? `${c.analytics.medianPackageLPA} LPA`
                            : (c.analytics?.hasVerifiedData === false ? 'No verified data yet' : 'Undisclosed')}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Average Package */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">Average Package (Cohort Mean)</td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6 font-bold text-slate-800">
                        {c.analytics?.averagePackageLPA
                          ? `${c.analytics.averagePackageLPA} LPA`
                          : (c.analytics?.hasVerifiedData === false ? 'No verified data yet' : 'Undisclosed')}
                      </td>
                    ))}
                  </tr>

                  {/* Highest Package */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">Highest Package</td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6 font-semibold text-emerald-600">
                        {c.analytics?.highestPackageLPA
                          ? `${c.analytics.highestPackageLPA} LPA`
                          : (c.analytics?.hasVerifiedData === false ? 'No verified data yet' : 'Undisclosed')}
                      </td>
                    ))}
                  </tr>

                  {/* Unique Placed vs Gross Offers */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">
                      Unique Placed vs Total Offers
                      <span className="block text-[10px] text-slate-400 font-normal">Headcounts separated</span>
                    </td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6">
                        {c.analytics?.hasVerifiedData ? (
                          <>
                            <div>Unique Placed: <strong className="text-slate-900">{c.analytics?.uniqueStudentsPlaced}</strong></div>
                            <div className="text-slate-500">Gross Offers: {c.analytics?.totalJobOffers}</div>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">No verified data yet</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Placement Percentage */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">
                      Verified Placement Rate
                      <span className="block text-[10px] text-slate-400 font-normal">Requires valid denominator</span>
                    </td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6">
                        {c.analytics?.hasVerifiedData === false ? (
                          <span className="text-slate-400 text-xs">No verified data yet</span>
                        ) : c.analytics?.placementRate?.canCalculate ? (
                          <div>
                            <span className="font-extrabold text-emerald-600 text-sm">
                              {c.analytics.placementRate.percentage}%
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ({c.analytics.uniqueStudentsPlaced} / {c.analytics.totalEligibleStudents})
                            </span>
                          </div>
                        ) : (
                          <div className="text-amber-700 text-[11px]">
                            <span className="font-semibold block">Rate Withheld</span>
                            <span>Denominator undisclosed</span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Recruiter Diversity */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">Recruiter Diversity</td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6">
                        <strong>{c.analytics?.uniqueRecruitersCount || 0}</strong> unique companies
                      </td>
                    ))}
                  </tr>

                  {/* Internship Benchmarks */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">Internship Median Stipend</td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6">
                        {c.internshipSummary.medianMonthlyStipendINR
                          ? `₹${c.internshipSummary.medianMonthlyStipendINR.toLocaleString('en-IN')}/mo`
                          : 'Pending submissions'}
                      </td>
                    ))}
                  </tr>

                  {/* Platform Data Quality */}
                  <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">Data Transparency Tier</td>
                    {comparisonResults.map((c, i) => (
                      <td key={i} className="py-3.5 px-6">
                        <span className="font-semibold text-slate-800">{c.dataQualityTier}</span>
                        <span className="text-[10px] text-slate-400 block">Score: {c.college.dataCompletenessScore}%</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* VISUAL BAR COMPARISON */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Compensation Visual Comparison (LPA)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="median" name="Median CTC (LPA)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="average" name="Average CTC (LPA)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
