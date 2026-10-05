import React from 'react';
import { Landmark, Building2, ShieldCheck, AlertCircle } from 'lucide-react';

export const InstitutionCategoryBadge = ({ category, subCategory, size = 'sm', showPolicy = false }) => {
  const isCategoryA = category === 'Category A: Premium Public' || category?.includes('Category A');
  const isCategoryB = category === 'Category B: Private' || category?.includes('Category B');

  const label = isCategoryA
    ? 'Category A: Premium Public'
    : isCategoryB
    ? 'Category B: Private'
    : 'Unclassified';

  const sub = subCategory && subCategory !== 'Unclassified' ? subCategory : null;

  const style = isCategoryA
    ? 'bg-purple-50 text-purple-800 border-purple-200'
    : isCategoryB
    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
    : 'bg-slate-100 text-slate-700 border-slate-300';

  const policyTooltip = isCategoryA
    ? 'Category A Policy: Official reports & statutory filings accepted from 2018–19 to current session. Missing metrics marked "Not reported".'
    : isCategoryB
    ? 'Category B Policy: Strict session-wise evidence required. Marketing claims not accepted as outcomes. Unverified sessions marked "Verified data not available".'
    : 'Platform classification pending.';

  const Icon = isCategoryA ? Landmark : Building2;

  const sizeClass = size === 'xs'
    ? 'text-[11px] px-2 py-0.5'
    : size === 'lg'
    ? 'text-sm px-3.5 py-1.5'
    : 'text-xs px-2.5 py-1 font-semibold';

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border ${style} ${sizeClass} font-semibold shadow-xs`}
        title={policyTooltip}
      >
        <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5 shrink-0'} />
        <span>{label}</span>
        {sub && (
          <span className="opacity-75 font-normal">
            ({sub})
          </span>
        )}
      </span>

      {showPolicy && (
        <span className="text-[11px] text-slate-500 font-medium">
          {isCategoryA
            ? '🏛️ Premium Public Historical Policy (IIT / NIT / IIIT)'
            : '🛡️ Strict Session-Wise Verification Policy (Private Institution)'}
        </span>
      )}
    </div>
  );
};
