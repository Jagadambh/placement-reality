import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collegeApi } from '../api/collegeApi';
import { DataBadge } from '../components/common/DataBadge';
import { TierBadge } from '../components/common/TierBadge';
import { InstitutionCategoryBadge } from '../components/common/InstitutionCategoryBadge';
import { SkeletonLoader, ErrorMessage, EmptyState } from '../components/common/FeedbackComponents';
import { Search, Filter, MapPin, Building, GraduationCap, ArrowRight, ShieldCheck, Award, Sparkles, Landmark } from 'lucide-react';
import { AddCollegeModal } from '../components/common/AddCollegeModal';
import { FALLBACK_TOP_50_COLLEGES, FALLBACK_CORE_COLLEGES } from '../data/fallbackData';

export const CollegeDirectoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddCollegeModalOpen, setIsAddCollegeModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [tier, setTier] = useState(searchParams.get('tier') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [course, setCourse] = useState(searchParams.get('course') || '');

  const fetchColleges = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (tier) params.tier = tier;
      if (state) params.state = state;
      if (course) params.course = course;

      const res = await collegeApi.getColleges(params);
      if (res.data?.success && res.data.data.colleges?.length > 0) {
        setColleges(res.data.data.colleges);
      } else {
        const allFallback = [...FALLBACK_CORE_COLLEGES, ...FALLBACK_TOP_50_COLLEGES];
        let filtered = allFallback;
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || (c.shortName && c.shortName.toLowerCase().includes(q)) || c.city.toLowerCase().includes(q));
        }
        if (tier) filtered = filtered.filter(c => c.tierClassification?.tier === tier);
        if (state) filtered = filtered.filter(c => c.state?.toLowerCase() === state.toLowerCase());
        setColleges(filtered);
      }
    } catch (err) {
      console.warn('Directory API failed, using embedded colleges dataset:', err.message);
      const allFallback = [...FALLBACK_CORE_COLLEGES, ...FALLBACK_TOP_50_COLLEGES];
      let filtered = allFallback;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || (c.shortName && c.shortName.toLowerCase().includes(q)) || c.city.toLowerCase().includes(q));
      }
      setColleges(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, [category, tier, state, course]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchColleges();
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setTier('');
    setState('');
    setCourse('');
    setSearchParams({});
    collegeApi.getColleges().then((res) => {
      if (res.data?.success) setColleges(res.data.data.colleges);
    });
  };

  const handleCollegeAdded = (newCollege) => {
    setColleges((prev) => [newCollege, ...prev]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <Building className="w-3.5 h-3.5" />
            <span>Institutional Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
            College Placement Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Explore officially filed NIRF disclosures, student-verified offer benchmarks, and branch-level compensation statistics across Tier 1, 2, and 3 colleges.
          </p>
        </div>

        <button
          onClick={() => setIsAddCollegeModalOpen(true)}
          className="self-start md:self-center px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Add Unlisted / New College</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-wider bg-brand-primary/10 px-3 py-1 rounded-full">
            PLACEMENT REALITY TRANSPARENT FORUM
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">• Comprehensive Institutional Directory</span>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="PLACEMENT REALITY TRANSPARENT FORUM - Search by college name, short code, or city..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-secondary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="">All Categories</option>
              <option value="Category A: Premium Public">Category A (IITs, NITs, IIITs)</option>
              <option value="Category B: Private">Category B (Private Sector)</option>
            </select>

            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="">All Tiers (Platform Index)</option>
              <option value="Tier 1">Tier 1 (Premier)</option>
              <option value="Tier 2">Tier 2 (Established)</option>
              <option value="Tier 3">Tier 3 (Regional / Developing)</option>
              <option value="Unclassified">Unclassified (New / Nascent)</option>
            </select>

            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="">All States</option>
              <option value="Odisha">Odisha</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Bihar">Bihar</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Delhi">Delhi</option>
            </select>

            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="">All Courses</option>
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
              <option value="MCA">MCA</option>
              <option value="MBA">MBA</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition"
            >
              Search
            </button>

            {(search || category || tier || state || course) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* College Cards Grid */}
      {loading ? (
        <SkeletonLoader count={4} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchColleges} />
      ) : colleges.length === 0 ? (
        <EmptyState
          title="No colleges match your filter parameters"
          description="Try broadening your search query or clearing specific tier/state criteria. Or if your college is new or unlisted, add it now!"
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setIsAddCollegeModalOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Add Unlisted College</span>
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colleges.map((college) => {
            const stats = college.latestStatsPreview;
            return (
              <div
                key={college._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Top tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TierBadge tier={college.tierClassification?.tier} rationale={college.tierClassification?.rationale} />
                      <InstitutionCategoryBadge
                        category={college.institutionCategory?.category}
                        subCategory={college.institutionCategory?.subCategory}
                        size="xs"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {college.city}, {college.state}
                    </span>
                  </div>

                  {/* College name & type */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-brand-primary transition">
                      <Link to={`/colleges/${college.slug}`}>{college.name}</Link>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-500 font-medium">{college.campusType}</span>
                      {college.isNewlyEstablished && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          <span>Est. {college.establishedYear} • New Campus</span>
                        </span>
                      )}
                      {college.isCommunitySubmitted && !college.isNewlyEstablished && (
                        <span className="text-[10px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded font-bold border border-sky-200">
                          Community Added
                        </span>
                      )}
                      {college.nirfRanking?.engineeringRank && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold border border-purple-200 flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" />
                          NIRF #{college.nirfRanking.engineeringRank}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Placement Preview Metrics */}
                  {stats ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Verified Season</span>
                        <span className="font-bold text-slate-800">{stats.academicYear}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Median CTC</span>
                          <span className="font-extrabold text-xs sm:text-sm text-brand-primary">
                            {stats.medianPackageLPA ? `${stats.medianPackageLPA} LPA` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Average CTC</span>
                          <span className="font-extrabold text-xs sm:text-sm text-indigo-600">
                            {stats.averagePackageLPA ? `${stats.averagePackageLPA} LPA` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Highest CTC</span>
                          <span className="font-extrabold text-xs sm:text-sm text-emerald-600">
                            {stats.highestPackageLPA ? `${stats.highestPackageLPA} LPA` : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/40">
                        <span>Unique Placed: <strong className="text-slate-700">{stats.uniqueStudentsPlaced ?? 'N/A'}</strong></span>
                        <span>Total Offers: <strong className="text-slate-700">{stats.totalJobOffers ?? 'N/A'}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 text-xs text-slate-400 text-center">
                      Placement report filing pending
                    </div>
                  )}

                  {/* Data Completeness Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Data Transparency Score</span>
                      <span className="font-bold text-slate-800">{college.dataCompletenessScore}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand-secondary h-1.5 rounded-full"
                        style={{ width: `${college.dataCompletenessScore || 50}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">{college.accreditation}</span>
                  <Link
                    to={`/colleges/${college.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-navy-950 transition"
                  >
                    <span>View Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add College Modal */}
      <AddCollegeModal
        isOpen={isAddCollegeModalOpen}
        onClose={() => setIsAddCollegeModalOpen(false)}
        onCollegeAdded={handleCollegeAdded}
      />
    </div>
  );
};
