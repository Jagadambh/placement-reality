import React from 'react';
import { ShieldCheck, UserCheck, Users, HelpCircle, EyeOff, AlertTriangle } from 'lucide-react';

const BADGE_CONFIG = {
  // Requirement 5 Standardized Verification Levels
  'Officially reported': {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ShieldCheck,
    label: 'Officially reported',
    desc: "Published in an institution's official report or official source. Note: An official report is not independent verification.",
  },
  'Officially Reported': {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ShieldCheck,
    label: 'Officially reported',
    desc: "Published in an institution's official report or official source. Note: An official report is not independent verification.",
  },
  'Independently verified': {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: UserCheck,
    label: 'Independently verified',
    desc: 'Supported by credible evidence beyond the institution’s own claims (e.g. verified student offer letters, RTI).',
  },
  'Student-Verified': {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: UserCheck,
    label: 'Independently verified',
    desc: 'Supported by credible evidence beyond the institution’s own claims (e.g. verified student offer letters, RTI).',
  },
  'Partially verified': {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: HelpCircle,
    label: 'Partially verified',
    desc: 'Some figures are supported, but important details remain unavailable.',
  },
  'Estimated/Incomplete': {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: HelpCircle,
    label: 'Partially verified',
    desc: 'Some figures are supported, but important details remain unavailable.',
  },
  'Unverified': {
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: EyeOff,
    label: 'Unverified',
    desc: 'Evidence is insufficient; kept out of public verified statistics.',
  },
  'Community-Reported': {
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Users,
    label: 'Community-Reported',
    desc: 'Submitted by student community. Awaiting moderator documentary audit.',
  },
  'Undisclosed': {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: EyeOff,
    label: 'Undisclosed / Not reported',
    desc: 'The institute has not published or disclosed this metric.',
  },
  'Not reported': {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: EyeOff,
    label: 'Not reported',
    desc: 'This specific metric was not disclosed in the official institutional report.',
  },
};

export const DataBadge = ({ status = 'Officially reported', size = 'sm', showTooltip = true }) => {
  const normalizedKey = BADGE_CONFIG[status] ? status : 'Partially verified';
  const config = BADGE_CONFIG[normalizedKey] || BADGE_CONFIG['Partially verified'];
  const Icon = config.icon;

  const sizeClasses = size === 'xs'
    ? 'text-xs px-2 py-0.5'
    : size === 'md'
    ? 'text-sm px-3 py-1 font-medium'
    : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} shadow-xs transition-all`}
      title={showTooltip ? config.desc : undefined}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{config.label}</span>
    </span>
  );
};
