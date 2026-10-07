import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const FloatingFeedbackButton = () => {
  const location = useLocation();
  
  // Don't show the button if we are already on the feedback page
  if (location.pathname === '/feedback') {
    return null;
  }

  return (
    <aside className="fixed bottom-6 left-6 z-40 flex flex-col items-center group animate-bounce-slow">
      <Link
        to="/feedback"
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-2xl shadow-blue-600/40 hover:shadow-blue-600/60 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/40 flex items-center justify-center relative cursor-pointer"
        title="Give Feedback"
        aria-label="Give Feedback"
      >
        <MessageSquarePlus className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
      </Link>
    </aside>
  );
};
