import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  Compass,
  LogOut,
  User,
  LayoutDashboard,
  FileText,
  Map,
  History,
  Camera,
  X,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  // Main navigation items (Profile moved inside account dropdown)
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Analyze', path: '/analysis', to: '/analysis/new', icon: FileText },
    { label: 'Roadmap', path: '/roadmap', to: '/roadmap', icon: Map },
    { label: 'ATS Resume', path: '/resume', to: '/resume', icon: FileText },
    { label: 'History & Diff', path: '/history', to: '/history', icon: History }
  ];

  const isItemActive = (item) => {
    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(item.path);
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
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const active = isItemActive(item);

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Profile / Unified Account Menu */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative" ref={accountMenuRef}>
                {/* Unified Account Trigger Button */}
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer focus:outline-none"
                  title="Account menu"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-indigo-500/40 bg-slate-100">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover block"
                        style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 leading-tight">
                      {user?.name || 'Account'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Google-styled Account Popover Dropdown (Matches User Reference Image) */}
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-72 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 p-4.5 z-50 animate-fadeIn select-none overflow-hidden">
                    {/* Header: Title & Close Button */}
                    <div className="flex items-center justify-between pb-3">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        CareerPilot Account
                      </span>
                      <button
                        type="button"
                        onClick={() => setAccountMenuOpen(false)}
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* User Identity Card: Strictly-sized Circular Avatar + Name + Email + PRO Badge */}
                    <div className="flex items-center gap-3 pb-3.5 border-b border-slate-800">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-indigo-500 shadow-sm bg-slate-800">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover block"
                            style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white truncate">{user?.name || 'User'}</h4>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-700">
                            PRO
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                      </div>
                    </div>

                    {/* Menu Options (Pill Buttons like Google in Image 2) */}
                    <div className="space-y-2 py-4 border-b border-slate-800">
                      <Link
                        to="/profile"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700/60 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-indigo-400" />
                          Profile & Career Settings
                        </span>
                        <span className="text-[10px] text-slate-400">Settings</span>
                      </Link>

                      <Link
                        to="/resume"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700/60 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-violet-400" />
                          ATS Resumes & Documents
                        </span>
                        <span className="text-[10px] text-slate-400">Resumes</span>
                      </Link>
                    </div>

                    {/* Sign Out Button (Pill button like Google in Image 2) */}
                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-slate-800/80 hover:bg-rose-950/40 text-xs font-semibold text-slate-300 hover:text-rose-300 border border-slate-700/60 hover:border-rose-800/50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
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

