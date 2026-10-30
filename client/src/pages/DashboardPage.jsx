import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import analysisService from '../services/analysisService.js';
import {
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileCheck2,
  Map,
  TrendingUp,
  FileText,
  Calendar,
  Eye,
  UploadCloud
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await analysisService.getAnalyses();
        if (res.success && res.data?.analyses?.length > 0) {
          setLatestAnalysis(res.data.analyses[0]);
        }
      } catch (err) {
        // Soft fail
      } finally {
        setLoadingAnalysis(false);
      }
    };

    fetchLatest();
  }, []);

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

      {/* Active Tracked Resume Section */}
      {latestAnalysis ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Active Resume On File
                </span>
                <span className="text-xs text-slate-400">
                  Uploaded {new Date(latestAnalysis.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {latestAnalysis.fileName || 'Uploaded_Resume.pdf'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Role: <strong className="text-slate-700">{latestAnalysis.targetRole}</strong> • ATS Match Score: <strong className="text-indigo-600">{latestAnalysis.matchScore}%</strong> • {latestAnalysis.missingSkills?.length || 0} gaps remaining
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/analysis/${latestAnalysis._id}`}>
              <Button variant="outline" size="sm">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                View Analysis Report
              </Button>
            </Link>
            <Link to="/analysis/new">
              <Button variant="primary" size="sm">
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Upload New Version
              </Button>
            </Link>
          </div>
        </div>
      ) : !loadingAnalysis ? (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">No Resume Uploaded Yet</h4>
              <p className="text-xs text-slate-500">Upload your resume once to get your score and track progress over time.</p>
            </div>
          </div>
          <Link to="/analysis/new">
            <Button variant="primary" size="sm">
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
              Upload Resume
            </Button>
          </Link>
        </div>
      ) : null}

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

            <Link
              to="/roadmap"
              className="p-4 rounded-xl border border-sky-200 bg-sky-50/30 hover:bg-sky-50/70 transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Map className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-sky-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm group-hover:text-sky-600 transition-colors">
                3. 12-Week Roadmap
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Follow milestone tasks with 1 curated resource per milestone.
              </p>
            </Link>

            <Link
              to="/history"
              className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/70 transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                4. Re-analysis Loop & Compare
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Re-upload updated resumes to track score improvement charts and export ATS PDFs.
              </p>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

