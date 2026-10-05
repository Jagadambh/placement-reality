import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { roiApi } from '../api/roiApi';
import { runFullRoiSimulation } from '../utils/roiCalculator';
import { SkeletonLoader, ErrorMessage } from '../components/common/FeedbackComponents';
import { FALLBACK_TOP_50_COLLEGES, FALLBACK_CORE_COLLEGES } from '../data/fallbackData';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  DollarSign,
  Briefcase,
  Home,
  RefreshCw,
  Share2,
  ChevronDown,
  ChevronUp,
  Layers,
  Award,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

export const RoiLoanSimulatorPage = () => {
  const [searchParams] = useSearchParams();

  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [selectedCollegeId, setSelectedCollegeId] = useState(searchParams.get('collegeId') || '');

  // Simulation Input Parameters
  const [totalFee, setTotalFee] = useState(1800000);
  const [downPayment, setDownPayment] = useState(200000);
  const [annualCtc, setAnnualCtc] = useState(8.5);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(7);
  const [livingExpenses, setLivingExpenses] = useState(18000);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [annualBonus, setAnnualBonus] = useState(0);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');

  // Comparison State
  const [compareColleges, setCompareColleges] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch colleges with fee and placement packages
  useEffect(() => {
    roiApi
      .getRoiColleges()
      .then((res) => {
        let list = (res.data?.success && res.data.data.colleges?.length > 0)
          ? res.data.data.colleges
          : [];

        if (list.length === 0) {
          list = [...FALLBACK_CORE_COLLEGES, ...FALLBACK_TOP_50_COLLEGES].map(c => ({
            _id: c._id,
            name: c.name,
            shortName: c.shortName,
            totalCourseFeeInr: 1600000,
            benchmarkMedianLPA: c.latestPlacementRecord?.medianPackageLPA || 8.0,
            latestStats: { medianPackageLPA: c.latestPlacementRecord?.medianPackageLPA || 8.0 },
          }));
        }

        setColleges(list);
        const initialId = searchParams.get('collegeId');
        const matched = list.find((c) => c._id === initialId) || list[0];
        if (matched) {
          applyCollegePreset(matched);
        }
      })
      .catch((err) => {
        console.warn('ROI colleges API error, using embedded dataset:', err);
        const list = [...FALLBACK_CORE_COLLEGES, ...FALLBACK_TOP_50_COLLEGES].map(c => ({
          _id: c._id,
          name: c.name,
          shortName: c.shortName,
          totalCourseFeeInr: 1600000,
          benchmarkMedianLPA: c.latestPlacementRecord?.medianPackageLPA || 8.0,
          latestStats: { medianPackageLPA: c.latestPlacementRecord?.medianPackageLPA || 8.0 },
        }));
        setColleges(list);
        if (list.length > 0) applyCollegePreset(list[0]);
      })
      .finally(() => setLoadingColleges(false));
  }, []);

  // Preset apply function
  const applyCollegePreset = (col) => {
    if (!col) return;
    setSelectedCollegeId(col._id);
    const fee = col.totalCourseFeeInr || 1800000;
    setTotalFee(fee);
    setDownPayment(Math.min(200000, Math.round(fee * 0.1)));

    const med = col.benchmarkMedianLPA || col.latestStats?.medianPackageLPA || 8.0;
    setAnnualCtc(med);

    if (col.feeCategories && col.feeCategories.length > 0) {
      setSelectedCategoryName(col.feeCategories[0].categoryName);
    } else {
      setSelectedCategoryName('');
    }
  };

  // Handle dropdown selection
  const handleSelectCollege = (e) => {
    const colId = e.target.value;
    setSelectedCollegeId(colId);
    const matched = colleges.find((c) => c._id === colId);
    if (matched) {
      applyCollegePreset(matched);
    }
  };

  // Handle fee category change (e.g., VIT Category 1 vs Category 3)
  const handleFeeCategoryChange = (catName) => {
    setSelectedCategoryName(catName);
    const col = colleges.find((c) => c._id === selectedCollegeId);
    if (col && col.feeCategories) {
      const cat = col.feeCategories.find((fc) => fc.categoryName === catName);
      if (cat && cat.totalFourYearFeeInr) {
        setTotalFee(cat.totalFourYearFeeInr);
      }
    }
  };

  // Run Real-Time High-Precision Simulation
  const result = useMemo(() => {
    return runFullRoiSimulation({
      totalFee,
      downPayment,
      annualCtc,
      interestRate,
      tenureYears,
      livingExpenses,
      extraMonthly,
      annualBonus,
    });
  }, [totalFee, downPayment, annualCtc, interestRate, tenureYears, livingExpenses, extraMonthly, annualBonus]);

  // Selected College Object
  const currentCollege = useMemo(() => {
    return colleges.find((c) => c._id === selectedCollegeId) || null;
  }, [colleges, selectedCollegeId]);

  // Chart Data: Monthly Cashflow Distribution
  const cashflowChartData = useMemo(() => {
    const emi = result.loan.monthlyEmi;
    const living = result.living;
    const savings = Math.max(0, result.disposableSavings);
    const deficit = result.disposableSavings < 0 ? Math.abs(result.disposableSavings) : 0;

    return [
      { name: 'Loan EMI', value: emi, color: '#f97316' },
      { name: 'Living & Rent', value: living, color: '#6366f1' },
      ...(savings > 0 ? [{ name: 'Disposable Savings', value: savings, color: '#10b981' }] : []),
      ...(deficit > 0 ? [{ name: 'Monthly Deficit', value: deficit, color: '#ef4444' }] : []),
    ];
  }, [result]);

  // Add college to multi-comparison
  const handleAddToCompare = (col) => {
    if (compareColleges.some((c) => c._id === col._id)) return;
    if (compareColleges.length >= 3) {
      alert('You can compare up to 3 colleges simultaneously.');
      return;
    }
    setCompareColleges([...compareColleges, col]);
    setShowComparison(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-slate-900 to-brand-primary text-white p-8 md:p-10 shadow-xl border border-slate-800">
          <div className="relative z-10 max-w-4xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Calculator className="w-3.5 h-3.5" />
              <span>Realistic Financial Planning Engine</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              College ROI & Education Loan Simulator
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
              Don't base life-altering financial decisions on advertised ₹1 Crore highest packages. Model your exact monthly loan EMI, post-tax take-home salary (New Tax Regime), and debt-free timeline using <strong>verified campus median salaries</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 border border-white/15">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>New Tax Regime FY 2024–25 Built-In</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 border border-white/15">
                <Building className="w-3.5 h-3.5 text-blue-400" />
                <span>Real Campus Median Packages</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 border border-white/15">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Prepayment Acceleration Simulator</span>
              </span>
            </div>
          </div>

          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-secondary/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* COLLEGE QUICK-PRESET SELECTOR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Quick Benchmark Preset</span>
              <span className="text-sm font-bold text-slate-900">Select an Indian Engineering College</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={selectedCollegeId}
              onChange={handleSelectCollege}
              className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary w-full md:w-80 truncate"
            >
              <option value="">Choose a college to auto-populate fees & median package...</option>
              {colleges.map((col) => (
                <option key={col._id} value={col._id}>
                  {col.name} ({col.city}, {col.state})
                </option>
              ))}
            </select>

            {currentCollege && (
              <button
                type="button"
                onClick={() => handleAddToCompare(currentCollege)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>+ Compare ROI</span>
              </button>
            )}
          </div>
        </div>

        {/* FEE CATEGORY PILLS (e.g. VIT Cat 1 vs Cat 3, KCET vs COMEDK) */}
        {currentCollege && currentCollege.feeCategories && currentCollege.feeCategories.length > 1 && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs animate-fadeIn">
            <span className="font-bold text-slate-700 block">
              Fee Category / Admission Quota for {currentCollege.shortName || currentCollege.name}:
            </span>
            <div className="flex flex-wrap gap-2">
              {currentCollege.feeCategories.map((fc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleFeeCategoryChange(fc.categoryName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    selectedCategoryName === fc.categoryName
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{fc.categoryName}</span>
                  <span className="ml-1.5 opacity-75 font-normal">
                    (₹{(fc.totalFourYearFeeInr / 100000).toFixed(2)}L)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MAIN SIMULATOR GRID: CONTROLS (LEFT 7 COLS) + RESULTS (RIGHT 5 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT 7 COLS: INTERACTIVE FINANCIAL INPUTS */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">1. College Investment & Loan Parameters</h2>
                  <p className="text-xs text-slate-500">Customize fee, down payment, bank interest, and tenure</p>
                </div>
                <button
                  onClick={() => {
                    setTotalFee(1800000);
                    setDownPayment(200000);
                    setAnnualCtc(8.5);
                    setInterestRate(8.5);
                    setTenureYears(7);
                    setLivingExpenses(18000);
                    setExtraMonthly(0);
                    setAnnualBonus(0);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Slider 1: Total 4-Year College Fee */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Total 4-Year College Investment (Tuition + Hostel)</span>
                  <span className="font-extrabold text-sm text-slate-900">
                    ₹{(totalFee / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max="4000000"
                  step="50000"
                  value={totalFee}
                  onChange={(e) => setTotalFee(Number(e.target.value))}
                  className="w-full accent-brand-primary h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>₹2L (Public / State)</span>
                  <span>₹15L - ₹22L (Typical Private)</span>
                  <span>₹40L (High-Tier Private / NRI)</span>
                </div>
              </div>

              {/* Slider 2: Down Payment / Family Contribution */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Family Savings / Down Payment</span>
                  <span className="font-extrabold text-sm text-slate-900">
                    ₹{(downPayment / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.min(totalFee, 2000000)}
                  step="25000"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>₹0 (100% Loan)</span>
                  <span>Net Loan Needed: ₹{((result.principal) / 100000).toFixed(2)} Lakhs</span>
                  <span>₹20L</span>
                </div>
              </div>

              {/* Slider 3: Expected Annual Package CTC (Defaults to Median) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">Expected Annual Salary (CTC)</span>
                    {currentCollege && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 font-bold">
                        Median: ₹{currentCollege.benchmarkMedianLPA} LPA
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-base text-emerald-600">
                    ₹{annualCtc} LPA
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="40"
                  step="0.5"
                  value={annualCtc}
                  onChange={(e) => setAnnualCtc(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>₹3.5 LPA (Mass Drive)</span>
                  <span>₹8 - ₹12 LPA (Tier-2 Median)</span>
                  <span>₹20+ LPA (Dream / Tier-1)</span>
                </div>
              </div>

              {/* Bank Presets & Loan Interest Rate */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Education Loan Interest Rate</span>
                  <span className="font-extrabold text-sm text-slate-900">{interestRate}% p.a.</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { label: 'SBI Scholar (8.15%)', rate: 8.15 },
                    { label: 'Bank of Baroda (8.50%)', rate: 8.5 },
                    { label: 'HDFC Credila (10.25%)', rate: 10.25 },
                    { label: 'NBFC / Unsecured (11.50%)', rate: 11.5 },
                  ].map((preset) => (
                    <button
                      key={preset.rate}
                      type="button"
                      onClick={() => setInterestRate(preset.rate)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        interestRate === preset.rate
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="6.5"
                  max="14"
                  step="0.25"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-brand-primary h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Loan Repayment Tenure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Loan Repayment Tenure</span>
                  <span className="font-extrabold text-sm text-slate-900">{tenureYears} Years</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {[5, 7, 10, 15].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTenureYears(t)}
                      className={`py-2 rounded-xl font-bold border transition ${
                        tenureYears === t
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t} Years
                    </button>
                  ))}
                </div>
              </div>

              {/* Living Expenses in Job City */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Monthly Living Expenses (Rent, Food, Commute)</span>
                  <span className="font-extrabold text-sm text-indigo-600">
                    ₹{livingExpenses.toLocaleString()}/mo
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { label: 'Bengaluru / Mumbai', amount: 22000 },
                    { label: 'Pune / Hyderabad', amount: 18000 },
                    { label: 'Noida / Kolkata', amount: 14000 },
                    { label: 'Living with Parents', amount: 5000 },
                  ].map((city) => (
                    <button
                      key={city.amount}
                      type="button"
                      onClick={() => setLivingExpenses(city.amount)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition ${
                        livingExpenses === city.amount
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate">{city.label}</div>
                      <div className="text-[10px] opacity-80">₹{(city.amount / 1000).toFixed(0)}k/mo</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PREPAYMENT ACCELERATION ACCORDION */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900">Prepayment Power: How to Become Debt-Free Years Earlier</h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Prepayment Engine
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Even an extra ₹2,000 to ₹5,000 per month from salary appraisals drastically cuts compound interest and shaves off years of debt.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Extra monthly */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Extra Monthly Prepayment: ₹{extraMonthly.toLocaleString()}/mo
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="1000"
                    value={extraMonthly}
                    onChange={(e) => setExtraMonthly(Number(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>₹0</span>
                    <span>₹10,000/mo</span>
                    <span>₹20,000/mo</span>
                  </div>
                </div>

                {/* Annual bonus */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Annual Bonus Prepayment: ₹{annualBonus.toLocaleString()}/yr
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="150000"
                    step="10000"
                    value={annualBonus}
                    onChange={(e) => setAnnualBonus(Number(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>₹0</span>
                    <span>₹50,000/yr</span>
                    <span>₹1.5 Lakh/yr</span>
                  </div>
                </div>
              </div>

              {/* Prepayment impact banner */}
              {(extraMonthly > 0 || annualBonus > 0) && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-950 block">
                      🚀 Prepayment Impact: Become Debt-Free in {result.prepayment.newTenureYears} Years!
                    </span>
                    <span className="text-amber-800 text-[11px]">
                      You finish your loan <strong>{result.prepayment.yearsSaved} years sooner</strong> and save <strong>₹{result.prepayment.interestSaved.toLocaleString()}</strong> in interest.
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-black text-amber-900 block">
                      Saved: ₹{result.prepayment.interestSaved.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLS: REAL-TIME SIMULATION DASHBOARD */}
          <div className="lg:col-span-5 space-y-5">

            {/* VERDICT & RISK RATING CARD */}
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${result.risk.color}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-75">
                  Financial Reality Rating
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/80 border border-current shadow-2xs">
                  ROI Score: {result.roiScore}/100
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">{result.risk.verdict}</h3>
                <p className="text-xs leading-relaxed mt-1 opacity-90">{result.risk.description}</p>
              </div>

              {/* EMI-to-Income DTI Gauge */}
              <div className="space-y-1.5 pt-2 border-t border-current/20 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span>Debt-to-Income (DTI) Ratio:</span>
                  <span className="text-sm font-extrabold">{result.dti}% of in-hand salary</span>
                </div>
                <div className="w-full bg-white/60 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      result.dti <= 28 ? 'bg-emerald-500' : result.dti <= 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, result.dti)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] opacity-75 font-semibold">
                  <span>&lt;28% Safe</span>
                  <span>28%-40% Moderate</span>
                  <span>&gt;40% Stress</span>
                </div>
              </div>
            </div>

            {/* MONTHLY CASHFLOW BREAKDOWN CARD */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Monthly In-Hand Bank Cashflow
              </h3>

              {/* 3 Key Stats */}
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Real Monthly In-Hand Pay
                    </span>
                    <span className="text-lg font-extrabold text-slate-900">
                      ₹{result.salary.netMonthly.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-slate-500">
                    <div>Gross CTC: ₹{result.salary.grossMonthly.toLocaleString()}</div>
                    <div className="text-rose-600 font-medium">Tax/EPF: -₹{((result.salary.grossMonthly - result.salary.netMonthly)).toLocaleString()}</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">
                      Monthly Loan EMI
                    </span>
                    <span className="text-lg font-extrabold text-orange-600">
                      ₹{result.loan.monthlyEmi.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-orange-700">
                    <div>Tenure: {tenureYears} Years</div>
                    <div>Rate: {interestRate}%</div>
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                  result.disposableSavings >= 0
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      Net Disposable Savings Left
                    </span>
                    <span className="text-lg font-extrabold block">
                      {result.disposableSavings >= 0 ? '+' : ''}₹{result.disposableSavings.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="text-right text-[10px] opacity-75">
                    <div>After EMI & ₹{livingExpenses.toLocaleString()} Living</div>
                  </div>
                </div>
              </div>

              {/* CASHFLOW DONUT PIE CHART */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                  Monthly Salary Allocation
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cashflowChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {cashflowChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [`₹${val.toLocaleString()}/mo`, 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap justify-center gap-3 text-[11px] font-medium pt-1">
                  {cashflowChartData.map((d, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* LOAN SUMMARY TOTALS */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Interest Paid</span>
                  <span className="font-extrabold text-slate-800">
                    ₹{(result.loan.totalInterest / 100000).toFixed(2)} Lakhs
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Bank Repayment</span>
                  <span className="font-extrabold text-slate-800">
                    ₹{(result.loan.totalPayment / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* MULTI-COLLEGE SIDE-BY-SIDE ROI COMPARISON MODAL */}
        {showComparison && compareColleges.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-primary" />
                <h3 className="font-bold text-base text-slate-900">Side-by-Side College ROI Benchmark</h3>
              </div>
              <button
                onClick={() => setShowComparison(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close Comparison
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold uppercase text-[10px] text-slate-500 w-48">Financial Metric</th>
                    {compareColleges.map((c) => (
                      <th key={c._id} className="py-3 px-4 min-w-[200px]">
                        <div className="font-extrabold text-slate-900 text-sm">{c.shortName || c.name}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{c.city}, {c.state}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-600 bg-slate-50/50">4-Year Total Investment</td>
                    {compareColleges.map((c) => (
                      <td key={c._id} className="py-3 px-4 font-extrabold text-slate-900">
                        ₹{(c.totalCourseFeeInr / 100000).toFixed(2)} Lakhs
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-600 bg-slate-50/50">Verified Median Package</td>
                    {compareColleges.map((c) => (
                      <td key={c._id} className="py-3 px-4 font-extrabold text-emerald-600">
                        ₹{c.benchmarkMedianLPA} LPA
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-600 bg-slate-50/50">Simulated Monthly In-Hand</td>
                    {compareColleges.map((c) => {
                      const sim = runFullRoiSimulation({
                        totalFee: c.totalCourseFeeInr,
                        annualCtc: c.benchmarkMedianLPA,
                      });
                      return (
                        <td key={c._id} className="py-3 px-4 font-bold text-slate-800">
                          ₹{sim.salary.netMonthly.toLocaleString()}/mo
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-600 bg-slate-50/50">Monthly Loan EMI (7 Yrs)</td>
                    {compareColleges.map((c) => {
                      const sim = runFullRoiSimulation({
                        totalFee: c.totalCourseFeeInr,
                        annualCtc: c.benchmarkMedianLPA,
                      });
                      return (
                        <td key={c._id} className="py-3 px-4 font-extrabold text-orange-600">
                          ₹{sim.loan.monthlyEmi.toLocaleString()}/mo
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-600 bg-slate-50/50">Debt-to-Income (DTI) %</td>
                    {compareColleges.map((c) => {
                      const sim = runFullRoiSimulation({
                        totalFee: c.totalCourseFeeInr,
                        annualCtc: c.benchmarkMedianLPA,
                      });
                      return (
                        <td key={c._id} className="py-3 px-4 font-extrabold">
                          <span className={`px-2 py-0.5 rounded-md ${
                            sim.dti <= 28 ? 'bg-emerald-50 text-emerald-700' : sim.dti <= 40 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {sim.dti}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-600 bg-slate-50/50">ROI Verdict</td>
                    {compareColleges.map((c) => {
                      const sim = runFullRoiSimulation({
                        totalFee: c.totalCourseFeeInr,
                        annualCtc: c.benchmarkMedianLPA,
                      });
                      return (
                        <td key={c._id} className="py-3 px-4 font-bold text-xs">
                          {sim.risk.verdict}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
