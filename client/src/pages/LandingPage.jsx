import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collegeApi } from '../api/collegeApi';
import { DataBadge } from '../components/common/DataBadge';
import { TierBadge } from '../components/common/TierBadge';
import founderImage from '../assets/harish-sonkar.jpg';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Shield,
  Layers,
  ArrowRight,
  FileCheck,
  Building,
  Users,
  Briefcase,
  HelpCircle,
  Quote,
  Sparkles,
  Terminal,
  ArrowUpRight,
  Award,
  GraduationCap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [colleges, setColleges] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  useEffect(() => {
    collegeApi.getColleges({ limit: 8 }).then((res) => {
      if (res.data?.success) {
        setColleges(res.data.data.colleges);
      }
    }).catch(console.error);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      const matches = colleges.filter((c) =>
        c.name.toLowerCase().includes(val.toLowerCase()) ||
        (c.shortName && c.shortName.toLowerCase().includes(val.toLowerCase())) ||
        c.city.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuggestions(matches);
    } else {
      setFilteredSuggestions([]);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/colleges?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/colleges');
    }
  };

  // Zero Synthetic Data Policy: We strictly query real verified statistics.


  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-navy-50/60 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-200 bg-purple-50/80 text-purple-700 text-xs font-semibold shadow-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Independent Platform • Never Fabricated • Denominator Verified</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-950 tracking-tight leading-[1.15]">
              Know the <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-purple-600">Reality Behind</span> College Placements.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Cut through promotional marketing brochures. Uncover actual median salaries, unique student placements, undisclosed denominators, and student-verified offers across Tier 1, Tier 2, and Tier 3 engineering institutions.
            </p>

            {/* College Search Bar */}
            <div className="relative max-w-2xl mx-auto mt-4">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <div className="absolute left-4 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search college by name (e.g. KIIT, VIT, IIT Bombay, MIT)..."
                  className="w-full pl-12 pr-32 py-4 bg-white rounded-2xl border border-slate-300 shadow-lg shadow-slate-200/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-5 py-2.5 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center gap-1.5"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Suggestions dropdown */}
              {filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-20 text-left">
                  {filteredSuggestions.map((col) => (
                    <div
                      key={col._id}
                      onClick={() => navigate(`/colleges/${col.slug}`)}
                      className="px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{col.name}</div>
                        <div className="text-xs text-slate-500">{col.city}, {col.state}</div>
                      </div>
                      <TierBadge tier={col.tierClassification?.tier} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Quick explore:</span>
              {['KIIT Bhubaneswar', 'VIT Vellore', 'IIT Bombay', 'MIT Muzaffarpur'].map((name) => (
                <button
                  key={name}
                  onClick={() => navigate(`/colleges?search=${encodeURIComponent(name.split(' ')[0])}`)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CORE TRANSPARENCY PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs uppercase tracking-widest text-brand-secondary font-bold">The Reality Standard</span>
          <h2 className="text-3xl font-extrabold text-navy-950">How Placement Reality Works</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Why traditional brochures deceive, and how our multi-tier verification restores factual integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Unique Placed vs Total Offers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Colleges boast "150% placements" by counting one high achiever's 4 offers four times. We strictly separate unique individuals placed from gross offer counts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Denominator Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If an institute refuses to disclose total eligible students, we categorically refuse to manufacture an arbitrary placement percentage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Confidential Student Proof</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Students upload offer letters securely to earn the "Student-Verified" badge. Personal PII and letter contents remain strictly confidential.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Audited Placement Analytics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ground-truth medians, official NIRF Section 4 filings, and verified institutional records without deceptive marketing exaggerations.
            </p>
          </div>
        </div>
      </section>

      {/* VERIFICATION PIPELINE ARCHITECTURE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-secondary uppercase tracking-wider">Zero Synthetic Data Policy</span>
                <DataBadge status="Verified" size="xs" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">How Evidence-Based Data Verification Works</h3>
              <p className="text-xs text-slate-600">
                We never display fabricated statistics or unverified marketing numbers. Every public metric undergoes a 3-tier validation protocol.
              </p>
            </div>
            <Link
              to="/colleges"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
            >
              <span>Explore Verified Colleges</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h4 className="font-bold text-base text-slate-900">Student Evidence Vault</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Students voluntarily upload offer letters, salary certificates, and college IDs. Documents are stored privately and inspected by verified moderators. Personal identity (PII) is permanently shielded from public views.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h4 className="font-bold text-base text-slate-900">Official Source Validation</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Official reports imported from college portals or NIRF Section 4 filings are recorded with their source URL, reporting year, and import timestamp. Records remain in Pending status until corroborated and verified.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h4 className="font-bold text-base text-slate-900">Denominator Disclosure</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                No marketing inflated percentages. If a college conceals its graduating class or eligible candidate denominator, the platform explicitly flags "Undisclosed Denominator" rather than calculating deceptive 100%+ rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STRICT VERIFICATION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Strict Provenance Standard</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">No Verified Data? We Tell You Honestly.</h3>
              <p className="text-xs text-slate-400 max-w-xl">
                When no verified statistics exist for a college or academic year, our platform clearly states: <em>"No verified placement data available yet."</em> We never fall back to fake demo cards or synthetic salary distributions.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/submit-offer"
                className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-navy-800 transition shadow-md whitespace-nowrap"
              >
                Submit An Offer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER & CEO SPOTLIGHT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-200 p-8 sm:p-12 shadow-sm overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Founder Circular Photo with Subtle Ring */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative group">
                {/* Subtle Animated Pulsing Ring */}
                <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-brand-primary via-indigo-500 to-brand-secondary opacity-35 blur-md group-hover:opacity-55 transition duration-700 animate-pulse" />

                {/* Circular image container */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full p-2 bg-white shadow-xl border-2 border-slate-200">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 shadow-inner">
                    <img
                      src={founderImage}
                      alt="Harish Sonkar - Founder & CEO"
                      className="w-full h-full object-cover object-top filter contrast-[1.03] group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Badge overlay */}
                <div className="absolute bottom-1 right-2 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full shadow-md border border-slate-200 flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Founder &amp; CEO</span>
                </div>
              </div>
            </div>

            {/* Right: Founder Introduction & Platform Vision */}
            <div className="lg:col-span-8 space-y-5 text-center lg:text-left">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Leadership &amp; Engineering</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  HARISH SONKAR
                </h3>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm font-semibold text-slate-600">
                  <span className="text-brand-secondary font-bold">Founder &amp; CEO</span>
                  <span className="text-slate-300">•</span>
                  <span>B.Tech Computer Science &amp; Engineering</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-700 font-bold">KIIT University (2024–28)</span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                "Computer Science student passionate about software development, full-stack engineering, AI/ML, real-time systems, and building practical technology solutions. Built Placement Reality to eliminate promotional marketing distortions and give Indian students verified, evidence-grounded placement intelligence."
              </p>

              {/* Verified Credentials Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>SIH 2025 Leader &amp; Adobe Hackathon</span>
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-primary" />
                  <span>KIIT University B.Tech CSE</span>
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>MERN Full-Stack Architect</span>
                </span>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/founder"
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-navy-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition hover:shadow"
                >
                  <span>View Founder Profile &amp; Projects</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <a
                  href="https://github.com/Jagadambh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-2 shadow-2xs transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>GitHub (@Jagadambh)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-navy-950 via-brand-primary to-navy-900 text-white p-10 sm:p-14 text-center space-y-6 shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Stop Guessing. Discover Real Placement Outcomes.
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Contribute your verified offer or internship to build authentic transparency for thousands of upcoming engineering & MBA students across India.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-white text-navy-950 font-bold text-sm hover:bg-slate-100 transition shadow-lg"
            >
              Join the Community
            </Link>
            <Link
              to="/colleges"
              className="px-6 py-3 rounded-xl bg-brand-secondary hover:bg-sky-600 text-white font-semibold text-sm transition flex items-center gap-2 border border-sky-400/30"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Explore Verified Colleges</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
