import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  Layers,
  Briefcase,
  MessageSquare,
  PlusCircle,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Scale,
  FileText,
  Award,
  Flame,
  Calculator,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, isModerator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Top 50 Private', path: '/top-private-engineering-colleges-india', icon: Award, isBadge: true },
    { name: 'Students & Seniors', path: '/student-verified', icon: ShieldCheck, highlight: true },
    { name: 'Official Reports', path: '/official-reports', icon: FileText },
    { name: 'ROI & Loan', path: '/roi-calculator', icon: Calculator },
    { name: 'Compare', path: '/compare', icon: Layers },
    { name: 'Campus Q&A', path: '/community', icon: MessageSquare },
    { name: 'Founder', path: '/founder', icon: User },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center group" title="Placement Reality" aria-label="Placement Reality">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-md shadow-brand-primary/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all ${
                    active
                      ? 'bg-slate-100 text-brand-primary font-bold'
                      : link.highlight
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold border border-emerald-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${link.highlight ? 'text-emerald-600' : ''}`} />
                  <span className="whitespace-nowrap">{link.name}</span>
                  {link.highlight && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                  {link.isBadge && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                      50
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                {isModerator && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </Link>
                )}

                {/* Profile menu */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <span className="max-w-[100px] truncate text-slate-700 font-medium text-xs">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {profileDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-xs"
                      onMouseLeave={() => setProfileDropdownOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="font-semibold text-slate-800 truncate">{user?.name}</p>
                        <p className="text-[11px] text-slate-600 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 capitalize">
                          {user?.role}
                        </span>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>Student Dashboard</span>
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>My Profile & Proof</span>
                      </Link>
                      {isModerator && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-purple-700 hover:bg-purple-50 font-semibold"
                        >
                          <Shield className="w-3.5 h-3.5 text-purple-600" />
                          <span>Admin & Verification Center</span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 border-t border-slate-100"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                {/* Join Us circular box / button for students & access */}
                <Link
                  to="/join-us"
                  className="flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-800 transition-all hover:scale-105 border border-blue-400/40 group"
                  title="Join Us — Student Verification & Sign In"
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:rotate-12 transition-transform shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="tracking-tight text-xs font-bold">Join Us</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-slate-100 text-brand-primary font-bold'
                    : link.highlight
                    ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${link.highlight ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{link.name}</span>
                {link.highlight && (
                  <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Student Reality
                  </span>
                )}
                {link.isBadge && (
                  <span className="ml-auto px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                    50
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Dashboard
                </Link>
                {isModerator && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-purple-700"
                  >
                    Admin Console
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex flex-col pt-2">
                <Link
                  to="/join-us"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-3 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center gap-2 shadow-sm text-center"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Join Us (Student Verification &amp; Sign In)</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

