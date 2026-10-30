import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Compass, LogOut, User, LayoutDashboard, FileText, Map, History, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                CareerPilot
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 rounded">
                AI Powered
              </span>
            </div>
          </Link>

          {/* Navigation Links for Authenticated Users */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center space-x-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>
              <Link
                to="/analysis/new"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/60 rounded-lg transition-colors font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                Analyze
              </Link>
              <Link
                to="/roadmap"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Map className="w-3.5 h-3.5" />
                Roadmap
              </Link>
              <Link
                to="/tracker"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Tracker
              </Link>
              <Link
                to="/resume"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                ATS Resume
              </Link>
              <Link
                to="/history"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                History & Diff
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Profile
              </Link>
            </nav>
          )}

          {/* User profile / Auth buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-2 group">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || 'User'}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30 group-hover:ring-indigo-600 transition-all"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs ring-2 ring-indigo-500/20 group-hover:ring-indigo-600 transition-all">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                      {user?.name || 'User'}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">
                      {user?.email}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors ml-1"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-100 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

