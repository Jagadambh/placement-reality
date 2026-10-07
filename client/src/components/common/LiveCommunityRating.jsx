import React, { useState, useEffect } from 'react';
import { Star, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export const LiveCommunityRating = () => {
  const [stats, setStats] = useState({ averageRating: 4.8, totalReviews: 124 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/feedback/stats');
        if (res.data.success && res.data.data) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch rating stats');
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm relative overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-50 opacity-50 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider border border-blue-200">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Platform Rating</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Community Trust Index</h2>
            <p className="text-slate-600 max-w-lg mx-auto md:mx-0">
              Thousands of students and parents trust Placement Reality to provide uninflated, ground-truth data. See what our users think about the platform.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner flex-shrink-0 min-w-[280px]">
            <div className="text-5xl font-black text-slate-900 mb-2">{stats.averageRating.toFixed(1)}</div>
            <div className="flex items-center gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-6 h-6 ${i < Math.floor(stats.averageRating) ? 'fill-current' : i < Math.round(stats.averageRating) ? 'fill-current opacity-50' : 'text-slate-200'}`} />
              ))}
            </div>
            <span className="text-sm font-semibold text-slate-500 mb-5">
              Based on {stats.totalReviews} student reviews
            </span>
            <Link 
              to="/feedback"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/20"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Share Your Feedback</span>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};
