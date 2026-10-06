import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Sparkles } from 'lucide-react';

export const FloatingSubmitOfferButton = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Hide the floating button on the submission page itself and admin console
  if (location.pathname === '/submit-offer' || location.pathname.startsWith('/admin')) {
    return null;
  }

  const destination = isAuthenticated ? '/submit-offer' : '/join-us';

  return (
    <aside aria-label="Submit Offer Action" className="fixed bottom-6 right-6 z-40 flex flex-col items-center group">
      <Link
        to={destination}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-brand-primary via-indigo-600 to-blue-600 text-white shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/40 flex items-center justify-center relative cursor-pointer"
        title="Submit Placement Offer"
        aria-label="Submit Placement Offer"
      >
        <PlusCircle className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
        <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-indigo-700"></span>
      </Link>
      <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-xs text-[10px] font-extrabold text-white shadow-lg border border-slate-700/60 uppercase tracking-wider group-hover:bg-brand-primary transition-colors">
        Submit Offer
      </span>
    </aside>
  );
};

export default FloatingSubmitOfferButton;
