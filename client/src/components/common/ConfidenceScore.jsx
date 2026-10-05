import React from 'react';

export const ConfidenceScore = ({ score = 80, tier = 'High Transparency', factors = [] }) => {
  const getColor = () => {
    if (score >= 80) return 'text-emerald-600 border-emerald-500 bg-emerald-50';
    if (score >= 50) return 'text-blue-600 border-blue-500 bg-blue-50';
    return 'text-amber-600 border-amber-500 bg-amber-50';
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getColor()}`}>
        {score}%
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Data Quality Score</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">{tier}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Calculated from corroborating documents, verified submissions, and disclosed denominators.
        </p>
      </div>
    </div>
  );
};
