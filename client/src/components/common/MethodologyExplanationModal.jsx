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
          {/* Section 1: Core Mathematical Definitions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">1</span>
              <span>Mathematical Metric Definitions</span>
            </h4>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">📐 Arithmetic Mean (Average Package)</span>
                <p className="text-slate-600">
                  Calculated as: <code>Sum of package values ÷ total verified package records</code>. Computed with full floating-point precision without premature rounding or truncation.
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">⚖️ Median Package (p50)</span>
                <p className="text-slate-600">
                  The exact middle package value (or arithmetic mean of the two middle values) when all verified package records are sorted in ascending order. Never estimated or assumed from brochure averages.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5">
                  <span className="font-bold text-slate-900 block">🚀 Highest Package</span>
                  <p className="text-slate-600">Maximum verified annual CTC value in the approved session cohort.</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5">
                  <span className="font-bold text-slate-900 block">⚓ Lowest Package (Floor CTC)</span>
                  <p className="text-slate-600">Minimum verified compensation observed across valid accepted offers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Student Deduplication & Offer Accounting */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">2</span>
              <span>Unique Students vs. Package Records (De-duplication)</span>
            </h4>
            <p>
              When an individual student receives multiple job offers (e.g. TCS 7 LPA, Accenture 11 LPA, Microsoft 20 LPA), the platform protects against double counting:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-700">
              <li><strong className="text-slate-900">Unique Placed Students:</strong> Distinct count of students with an approved placed outcome (counted as 1 placed student).</li>
              <li><strong className="text-slate-900">Total Package Records:</strong> Count of all approved package values contributing to the distribution and mathematical metrics.</li>
            </ul>
          </div>

          {/* Section 3: Observed Placement Rate & Denominator Integrity */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">3</span>
              <span>Observed Placement Rate &amp; Denominator Integrity</span>
            </h4>
            <p>
              We label student statistics as <strong className="text-slate-900">"Observed Placement Rate"</strong>, calculated only when an independently verified cohort denominator is known:
            </p>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
              Observed Placement Rate = (Placed Verified Students ÷ Verified Students with Known Outcome) × 100
            </div>
            <p className="text-slate-500 text-[11px]">
              If the total eligible denominator is undisclosed, the platform explicitly renders "Undisclosed Denominator" rather than guessing.
            </p>
          </div>

          {/* Section 4: Strict Submission Lifecycle & Exclusions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">4</span>
              <span>Strict Lifecycle &amp; Exclusion Policy</span>
            </h4>
            <p>
              All statistics are computed live from active database records. Submissions are strictly filtered:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                <span className="font-bold block text-rose-950">🚫 Permanently Excluded</span>
                <span>DRAFT, PENDING, REJECTED, DELETED, UNPUBLISHED, and duplicate submissions.</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="font-bold block text-emerald-950">✅ Included in Live Stats</span>
                <span>Moderator-approved, document-verified, and published records only.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
};
