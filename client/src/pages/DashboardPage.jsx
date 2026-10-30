import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import {
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileCheck2,
  Map,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-medium backdrop-blur-sm mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Session Authenticated (JWT in httpOnly Cookie)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Explorer'}!
          </h1>
          <p className="mt-2 text-indigo-100 text-base sm:text-lg">
            Ready to discover your skill gaps and unlock your target role? CareerPilot analyzes your resume against target JDs and generates a personalized 12-week roadmap.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/analysis/new">
              <Button variant="primary" className="bg-white text-indigo-900 hover:bg-indigo-50 shadow-md">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                Analyze Your Resume Now
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="border-indigo-300/40 text-white hover:bg-white/10 bg-transparent">
                Update Target Role
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Account Info & System Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Active Profile" subtitle="Your authenticated identity">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Name</span>
              <span className="font-semibold text-slate-800">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Email</span>
              <span className="font-semibold text-slate-800">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono text-xs text-slate-600 truncate max-w-[150px]">{user?._id}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5">
              <span className="text-slate-500">Status</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active
              </span>
            </div>
          </div>
        </Card>

        <Card title="Next Steps" subtitle="Core CareerPilot pipeline" className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/profile"
              className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/70 transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                1. Profile & Target Role
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Configure your target role and current skills to tailor gap analysis.
              </p>
            </Link>

            <Link
              to="/analysis/new"
              className="p-4 rounded-xl border border-violet-200 bg-violet-50/30 hover:bg-violet-50/70 transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-violet-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm group-hover:text-violet-600 transition-colors">
                2. AI Skill-Gap Analysis
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Upload your resume (PDF/DOCX) to get an ATS match score and pinpoint missing skills.
              </p>
            </Link>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
                <Map className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">3. 12-Week Roadmap</h4>
              <p className="text-xs text-slate-500 mt-1">
                Follow milestone tasks with 1 curated resource per milestone.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">4. Re-analysis Loop</h4>
              <p className="text-xs text-slate-500 mt-1">
                Re-upload your updated resume to track score improvements and export an ATS resume.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

