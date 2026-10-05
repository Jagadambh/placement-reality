import React from 'react';
import { AlertTriangle, FolderOpen } from 'lucide-react';

export const SkeletonLoader = ({ count = 3, type = 'card' }) => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="h-5 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-100 rounded w-2/3"></div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ErrorMessage = ({ message = 'Something went wrong while fetching data.', onRetry }) => {
  return (
    <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-800 flex items-start gap-3 my-4">
      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-rose-900 text-sm">Operation Failed</h4>
        <p className="text-xs text-rose-700 mt-1 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export const EmptyState = ({ title = 'No records found', description, action }) => {
  return (
    <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 bg-white my-6">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <FolderOpen className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
