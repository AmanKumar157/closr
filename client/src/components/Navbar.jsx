import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { AnimatedThemeToggler } from './common/AnimatedThemeToggler.jsx';
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
  Menu,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  // Close menus on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && !e.target.closest('[data-mobile-menu-trigger]')) {
        setMobileMenuOpen(false);
      }
    };
    if (accountMenuOpen || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen, mobileMenuOpen]);

  // Main navigation items
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
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md transition-all group-hover:scale-105">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight lowercase text-foreground">
                closr
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground bg-primary rounded">
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
                        ? 'bg-secondary text-secondary-foreground font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Controls: Theme Toggle & User Account / Login */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Animated Light / Dark Mode Toggle with View Transitions API */}
            <AnimatedThemeToggler />

            {isAuthenticated ? (
              <div className="relative" ref={accountMenuRef}>
                {/* Unified Account Trigger Button */}
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border transition-all cursor-pointer focus:outline-none ${
                    accountMenuOpen
                      ? 'border-primary bg-secondary shadow-xs ring-2 ring-ring/30'
                      : 'border-border hover:border-primary/50 hover:bg-muted'
                  }`}
                  title="Account menu"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-ring/40 bg-muted">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover block"
                        style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground leading-tight">
                      {user?.name || 'Account'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Account Popover Dropdown */}
                {accountMenuOpen && (
                  <div className="account-dropdown-menu absolute right-0 mt-2.5 w-[calc(100vw-2rem)] max-w-sm sm:w-84 max-h-[calc(100vh-5rem)] overflow-y-auto bg-white dark:bg-[#16202c] text-foreground rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-6 z-50 animate-fadeIn select-none">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                          <Compass className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold tracking-wide text-foreground">
                          closr Account
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAccountMenuOpen(false)}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* User Identity Card */}
                    <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-slate-200 dark:border-slate-700/60">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/40 shadow-md bg-slate-100 dark:bg-slate-800">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover block"
                            style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate">{user?.name || 'User'}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-secondary text-secondary-foreground border border-slate-200 dark:border-slate-700">
                            PRO
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="space-y-2.5 pb-4 mb-4 border-b border-slate-200 dark:border-slate-700/60">
                      <Link
                        to="/profile"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 rounded-full bg-slate-50 dark:bg-[#202d3f] hover:bg-slate-100 dark:hover:bg-[#27384e] text-xs font-semibold text-foreground border border-slate-200 dark:border-slate-700/60 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-primary shrink-0" />
                          Profile & Career Settings
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">Settings</span>
                      </Link>

                      <Link
                        to="/resume"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 rounded-full bg-slate-50 dark:bg-[#202d3f] hover:bg-slate-100 dark:hover:bg-[#27384e] text-xs font-semibold text-foreground border border-slate-200 dark:border-slate-700/60 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          ATS Resumes & Documents
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">Resumes</span>
                      </Link>
                    </div>

                    {/* Sign Out Button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-slate-50 dark:bg-[#202d3f] hover:bg-destructive hover:text-white dark:hover:bg-destructive dark:hover:text-white text-xs font-semibold text-muted-foreground border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
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
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded-lg shadow-sm transition-opacity"
                >
                  Get Started
                </Link>
              </div>
            )}
            {/* Mobile Menu Toggle Button (< lg screens) */}
            {isAuthenticated && (
              <button
                type="button"
                data-mobile-menu-trigger="true"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setAccountMenuOpen(false);
                }}
                className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer (< lg screens) */}
      {isAuthenticated && mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="lg:hidden border-t border-border bg-card/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 animate-fadeIn shadow-2xl transition-all"
        >
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const active = isItemActive(item);

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-secondary text-primary font-bold shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick User Actions in Mobile Menu */}
          <div className="pt-3 mt-2 border-t border-border flex items-center justify-between gap-3">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 min-w-0 p-1.5 rounded-xl hover:bg-muted transition-colors flex-1"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted ring-2 ring-primary/40 shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{user?.name || 'My Profile'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-500 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
