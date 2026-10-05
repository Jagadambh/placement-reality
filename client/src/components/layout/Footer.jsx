import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Shield, CheckCircle2 } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-secondary flex items-center justify-center text-white font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-white">Placement Reality</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              An independent placement transparency and analytics platform. Transforming Indian college placement information through ground-truth data, verified student documents, and rigorous denominator analysis.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero-Fabrication Verification Guarantee</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Explore Platform</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/colleges" className="hover:text-white transition">College Directory</Link></li>
              <li><Link to="/top-private-engineering-colleges-india" className="hover:text-white transition">Top 50 Private Colleges</Link></li>
              <li><Link to="/roi-calculator" className="hover:text-white transition">ROI & Loan Simulator</Link></li>
              <li><Link to="/compare" className="hover:text-white transition">Multi-College Comparison</Link></li>
              <li><Link to="/community" className="hover:text-white transition">Campus Community & Q&A</Link></li>
              <li><Link to="/founder" className="text-amber-400 hover:text-amber-300 font-semibold transition">Founder &amp; CEO (Harish Sonkar)</Link></li>
            </ul>
          </div>

          {/* Transparency & Methodology */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Methodology</h4>
            <ul className="space-y-2 text-slate-400">
              <li><span className="text-slate-300">Denominator Verification</span> - No manufactured rates</li>
              <li><span className="text-slate-300">Unique vs Gross Offers</span> - Distinct headcounts</li>
              <li><span className="text-slate-300">Tier Benchmark</span> - Objective platform standards</li>
              <li><span className="text-slate-300">Privacy Safeguards</span> - Strict student PII protection</li>
            </ul>
          </div>

          {/* Compliance & DPDP */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Privacy & Legal</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
              Compliant with the Digital Personal Data Protection (DPDP) Act of India. Student offer letters and identity tokens are permanently protected with access restricted to verified auditing pipelines.
            </p>
            <div className="flex flex-wrap gap-3 text-slate-400">
              <span className="hover:text-white cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer">RTI & Disclosures</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div className="space-y-1 text-center md:text-left">
            <p>
              © {new Date().getFullYear()} Placement Reality. Built &amp; led by{' '}
              <Link to="/founder" className="text-slate-300 hover:text-white font-bold underline decoration-slate-600 underline-offset-2">
                HARISH SONKAR
              </Link>{' '}
              · Founder &amp; CEO · B.Tech CSE · KIIT University · 2024–28 Batch.
            </p>
            <p className="text-slate-400">Truth in numbers, empower the student. Zero synthetic metrics policy.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/founder" className="text-slate-400 hover:text-white transition">
              Founder Profile
            </Link>
            <span>•</span>
            <a
              href="https://github.com/Jagadambh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition"
            >
              GitHub (@Jagadambh)
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
