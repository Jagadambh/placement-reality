import React from 'react';
import { X, ShieldCheck, Scale, AlertTriangle, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Methodology Explanation Modal (Requirement 15)
 * Explains how Observed Placement Rate, Verified Package Records,
 * and Coverage are calculated, and why official college figures are kept strictly separate.
 */
export const MethodologyExplanationModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 border-b border-slate-100 pb-4 pr-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Placement Reality Methodology Standard</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            How Are Institutional Placement Statistics Calculated?
          </h3>
          <p className="text-xs text-slate-500">
            Transparent ground-truth analytics calculated from moderator-approved records only.
          </p>
        </div>

        {/* Explanation Sections */}
        <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
          {/* Section 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">1</span>
              <span>Observed Placement Rate vs. Official College Rate</span>
            </h4>
            <p>
              We label student statistics as <strong className="text-slate-900">"Observed Placement Rate"</strong>, never as the absolute "College Placement Rate" unless our dataset represents the entire verified student body:
            </p>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
              Observed Placement Rate = (Placed Verified Students / Verified Students with Known Outcome) × 100
            </div>
            <p className="text-slate-500 text-[11px]">
              Each enrolled student is de-duplicated and counted exactly once, regardless of how many job offers they received.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">2</span>
              <span>Verified Median Package Calculation</span>
            </h4>
            <p>
              The median package is computed mathematically from <strong className="text-slate-900">verified package records only</strong> (sorted middle value of approved offer salaries).
            </p>
            <p className="text-slate-500 text-[11px]">
              We never estimate the median, never extrapolate it from marketing brochures, and never assume it from a college's advertised average package.
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">3</span>
              <span>Strict Separation: Official Report vs. Student Reality</span>
            </h4>
            <p>
              Colleges publish what their placement cell claims in brochures. Students submit independent evidence (offer letters, compensation slips, and roll numbers). These two streams are <strong className="text-slate-900">never combined into a hybrid number</strong>. They are displayed side by side so discrepancies are immediately visible.
            </p>
          </div>

          {/* Section 4 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">4</span>
              <span>Coverage &amp; Small Sample Size Warnings</span>
            </h4>
            <p>
              Small student sample sizes are never disguised as whole-batch reality. When verified submissions represent a small cohort (&lt;10 students), the platform attaches an explicit warning:
            </p>
            <div className="p-2.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-[11px] font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                "Low sample size: This is an observed rate among verified Placement Reality records and may not represent the complete institutional placement rate."
              </span>
            </div>
          </div>

          {/* Section 5 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">5</span>
              <span>Zero Fabrication &amp; Demo Data Isolation</span>
            </h4>
            <p>
              Missing data is displayed as <strong className="text-slate-900">"Not available"</strong>, never as 0% or an arbitrary placeholder. Any simulated test data created during local development is strictly segregated and permanently excluded from public production statistics.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/methodology"
            onClick={onClose}
            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
          >
            <span>Read full 10-principle methodology guide</span>
            <span>→</span>
          </Link>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
