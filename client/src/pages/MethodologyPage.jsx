import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  FileCheck,
  AlertTriangle,
  Scale,
  Brain,
  Layers,
  Database,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  TrendingUp,
  Award,
  Globe,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const MethodologyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-navy-950 via-slate-900 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto space-y-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Placement Reality Architectural Standards</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Evidence-Backed Placement Intelligence Methodology
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Every public placement figure on this platform is backed by verifiable documentation, an exact academic session, and a tamper-proof audit trail. We strictly reject marketing estimates, hallucinated numbers, and undisclosed denominators.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Traceable Sources</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Synthetic Estimates</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Strict Academic Session Isolation</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-16">
        {/* Core Principles Grid */}
        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Core Foundations</span>
            <h2 className="text-2xl font-bold text-slate-900">The 10 Principles of Placement Truth</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Principle 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-base text-slate-900">Official Website Discovery Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We crawl only authorized institutional root domains (e.g., <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">.ac.in</code>, <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">.edu.in</code>). Third-party aggregator sites and marketing portals are systematically discarded to eliminate promotional inflation.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="font-bold text-base text-slate-900">Zero-Hallucination AI Extraction</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                AI and OCR tools serve exclusively as reading assistants. Every metric extracted must cite the exact verbatim text snippet and page number from the downloaded PDF. Missing figures remain explicitly <strong className="text-slate-800">"unavailable"</strong>; they are never guessed, imputed, or averaged.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-base text-slate-900">Strict Academic Session Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Historical records span 2018–19 to 2026–27. Data from adjacent sessions is never commingled. If an institution failed to publish figures for 2022–23, the platform displays <em className="text-amber-700 font-semibold">"No verified data available for 2022–23"</em> rather than bridging gaps with historical estimates.
              </p>
            </div>

            {/* Principle 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="font-bold text-base text-slate-900">Denominator Verification &amp; Coverage</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Placement percentages are only calculated when the total eligible population is officially reported:
                <br />
                <span className="inline-block mt-2 font-mono text-[11px] bg-slate-100 p-1.5 rounded text-slate-800">
                  Coverage % = (Unique Students Placed / Total Eligible Students) × 100
                </span>
                <br />
                If the eligible denominator is omitted, the platform displays <strong className="text-amber-700">"Undisclosed Denominator"</strong> rather than an arbitrary 100% claim.
              </p>
            </div>

            {/* Principle 5 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                05
              </div>
              <h3 className="font-bold text-base text-slate-900">Domestic vs. International Packages</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Overseas currency offers (e.g., $150,000 USD) are explicitly tagged and sequestered. They are never blended into domestic rupee averages to deceptively inflate perceived starting salaries.
              </p>
            </div>

            {/* Principle 6 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                06
              </div>
              <h3 className="font-bold text-base text-slate-900">Small Sample Size Warnings</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Student submissions representing &lt;10 students or &lt;5% of the graduating cohort trigger an immediate warning: <em className="text-amber-800">"Sample size too small to represent official institution average."</em> We never present small sample student data as an exhaustive census.
              </p>
            </div>

            {/* Principle 7 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm">
                07
              </div>
              <h3 className="font-bold text-base text-slate-900">Unique Placed Headcount vs. Gross Offers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Institutions often inflate placement totals by counting multiple job offers received by a single high-achieving student. We isolate unique individuals placed from gross offer counts to reflect real batch outcomes.
              </p>
            </div>

            {/* Principle 8 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-sm">
                08
              </div>
              <h3 className="font-bold text-base text-slate-900">Advertised vs. Verified Reality Gap</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We provide a side-by-side reconciliation between official marketing claims and student-submitted verified realities, calculating the discrepancy gap (e.g., Advertised Median ₹9.5 LPA vs. Verified Median ₹7.2 LPA, Delta -24.2%).
              </p>
            </div>

            {/* Principle 9 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm">
                09
              </div>
              <h3 className="font-bold text-base text-slate-900">Human Moderator Verification Gate</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No AI-extracted number or unvetted submission goes live automatically. Extracted records enter the Moderator Verification Hub where human reviewers verify citations against original PDF documents prior to publication.
              </p>
            </div>

            {/* Principle 10 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                10
              </div>
              <h3 className="font-bold text-base text-slate-900">Tamper-Proof Audit Logging</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every data ingestion, value correction, review approval, or classification change is permanently recorded in our immutable audit log with user ID, timestamp, prior value, and editorial rationale.
              </p>
            </div>
          </div>
        </section>

        {/* Verification Tiers Breakdown */}
        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Evidence Hierarchy</span>
            <h2 className="text-2xl font-bold text-slate-900">The 6 Verification Levels</h2>
            <p className="text-xs text-slate-600">
              Every statistic displays an unambiguous visual verification badge indicating its evidentiary weight.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟢</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Officially Reported</h4>
                  <p className="text-xs text-slate-600">
                    Figure explicitly published by the institution in an official placement report, annual report, or statutory NIRF disclosure.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full whitespace-nowrap">
                Highest Institutional Authority
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔵</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Independently Verified</h4>
                  <p className="text-xs text-slate-600">
                    Figure corroborated by multiple independent data points, statutory filings, or audited placement committee records.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full whitespace-nowrap">
                Independent Audit Corroboration
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟣</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Student Verified</h4>
                  <p className="text-xs text-slate-600">
                    Evidence submitted directly by a verified enrolled student with audited offer letter, company email, and redacted payslip.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-full whitespace-nowrap">
                Direct Ground Truth Evidence
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟡</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Partially Verified</h4>
                  <p className="text-xs text-slate-600">
                    Evidence partially supports the metric claim, but lacks full denominator context, official PDF, or complete documentation.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full whitespace-nowrap">
                Incomplete Evidence Context
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚪</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Unverified</h4>
                  <p className="text-xs text-slate-600">
                    Reported or claimed in press releases without verifiable source documentation or audited institutional reports.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                Uncorroborated Marketing
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-orange-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟠</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Pending Review</h4>
                  <p className="text-xs text-slate-600">
                    Discovered report or student submission currently queued in the Moderator Verification Hub awaiting human inspection.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-3 py-1 rounded-full whitespace-nowrap">
                Audit Pipeline In Progress
              </span>
            </div>
          </div>
        </section>

        {/* Data Quality Guardrails Section */}
        <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Automated Sentinel</span>
            <h3 className="text-2xl font-bold">Data Quality Auditor &amp; Automated Warnings</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Every college profile runs through the Data Quality Auditor service in real time to alert students to common deception tactics:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Conflicting Values</span>
              </div>
              <h5 className="font-semibold text-white text-sm">Table vs. Text Discrepancies</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                When a brochure claims "95% placed" in a headline banner but the internal statistical table records 620 placed out of 800 candidates (77.5%), our auditor flags the conflict immediately.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Missing Denominator</span>
              </div>
              <h5 className="font-semibold text-white text-sm">Selective Cohort Reporting</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                When colleges conceal the total number of registered students to mask unplaced graduates, we flag "Eligible Denominator Undisclosed" and refuse to synthesize a false percentage.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>CTC Outlier Distortion</span>
              </div>
              <h5 className="font-semibold text-white text-sm">Highest vs. Median Skew</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                When a single ₹1 Cr international package skews public perception of a college with a ₹5 LPA median, the platform issues an extreme outlier advisory prioritizing Median over Highest CTC.
              </p>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center space-y-4">
          <h3 className="text-2xl font-bold text-slate-900">Explore Evidence-Backed College Intelligence</h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Discover verified statistics from official institutional publications and confidential student submissions across India's top colleges.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/colleges"
              className="px-6 py-3 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-navy-800 transition shadow-md flex items-center gap-2"
            >
              <span>Browse College Directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/top-private-engineering-colleges-india"
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              View Top 50 Private Directory
            </Link>
            <Link
              to="/student-verified"
              className="px-6 py-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition border border-purple-200"
            >
              🎓 Student Verified Reviews
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
