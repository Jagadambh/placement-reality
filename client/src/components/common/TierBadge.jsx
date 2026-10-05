import React, { useState } from 'react';
import { Info } from 'lucide-react';

export const TierBadge = ({ tier = 'Tier 2', rationale }) => {
  const [showRationale, setShowRationale] = useState(false);

  const getColors = () => {
    switch (tier) {
      case 'Tier 1':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Tier 2':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Tier 3':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Unclassified':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <span
        onClick={() => setShowRationale(!showRationale)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getColors()} cursor-pointer select-none transition-all hover:opacity-90`}
      >
        <span>{tier}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-75 font-normal">(Platform Index)</span>
        <Info className="w-3 h-3 text-slate-400" />
      </span>

      {showRationale && (
        <div
          className="absolute z-30 bottom-full left-0 mb-2 w-72 p-3 bg-slate-900 text-slate-100 rounded-lg shadow-xl text-xs space-y-1.5 border border-slate-700"
          onMouseLeave={() => setShowRationale(false)}
        >
          <div className="font-semibold text-purple-300 flex items-center justify-between">
            <span>Platform Classification Notice</span>
            <button
              onClick={() => setShowRationale(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {rationale ||
              'Tier categorization on Placement Reality is an editorial classification benchmark based on verified cutoff percentiles, NIRF parameters, and placement medians. It is not an absolute state rating.'}
          </p>
        </div>
      )}
    </div>
  );
};
