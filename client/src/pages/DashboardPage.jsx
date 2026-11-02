import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import HyperText from '../components/common/HyperText.jsx';
import analysisService from '../services/analysisService.js';
import PdfViewerModal from '../components/common/PdfViewerModal.jsx';
import toast from 'react-hot-toast';
import {
  User,
  Sparkles,
  ArrowRight,
  FileCheck2,
  Map,
  TrendingUp,
  FileText,
  Calendar,
  Eye,
  UploadCloud,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteActiveResume = async () => {
    if (!latestAnalysis) return;
    if (
      !window.confirm(
        `Permanently delete "${latestAnalysis.fileName || 'this resume'}"? This will completely remove this resume, its AI analysis, and roadmaps from the database.`
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const res = await analysisService.deleteAnalysis(latestAnalysis._id);
      if (res.success) {
        toast.success('Resume and all associated records completely deleted from database.');
        setLatestAnalysis(null);
        // Refresh analysis list
        const refreshed = await analysisService.getAnalyses();
        if (refreshed.success && refreshed.data?.analyses?.length > 0) {
          setLatestAnalysis(refreshed.data.analyses[0]);
        }
      }
    } catch (err) {
      toast.error('Failed to delete resume.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await analysisService.getAnalyses();
        if (res.success && res.data?.analyses?.length > 0) {
          setLatestAnalysis(refreshedOrDefault(res.data.analyses));
        }
      } catch (err) {
        // Soft fail
      } finally {
        setLoadingAnalysis(false);
      }
    };

    const refreshedOrDefault = (analyses) => analyses?.[0] || null;

    fetchLatest();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="group relative bg-gradient-to-r from-[#172230] via-[#213042] to-[#16202c] rounded-2xl p-8 text-white shadow-xl overflow-hidden border border-border">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back,{' '}
            <HyperText as="span" className="text-white hover:text-sky-300">
              {user?.name || 'Explorer'}
            </HyperText>
            !
          </h1>
          <p className="mt-2 text-slate-300 text-base sm:text-lg">
            Ready to discover your skill gaps and unlock your target role? closr analyzes your resume against target JDs and generates a personalized 12-week roadmap.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/analysis/new">
              <Button variant="primary" className="shadow-md">
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Your Resume Now
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                Update Target Role
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Active Tracked Resume Section */}
      {latestAnalysis ? (
        <div className="group relative bg-card text-card-foreground rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors overflow-hidden">
          <div className="flex items-start sm:items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-secondary text-secondary-foreground border border-border flex items-center justify-center shrink-0 shadow-inner">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary-foreground bg-secondary px-2 py-0.5 rounded">
                  Active Resume On File
                </span>
                <span className="text-xs text-muted-foreground">
                  Uploaded {new Date(latestAnalysis.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>
              <h3 className="text-lg font-bold text-card-foreground mt-1">
                {latestAnalysis.fileName || 'Uploaded_Resume.pdf'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target Role: <strong className="text-foreground">{latestAnalysis.targetRole}</strong> • ATS Match Score: <strong className="text-primary font-bold">{latestAnalysis.matchScore}%</strong> • {latestAnalysis.missingSkills?.length || 0} gaps remaining
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPdfModal(true)}
              className="w-full sm:w-auto border-border text-foreground hover:bg-muted font-semibold justify-center"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Open PDF Viewer
            </Button>
            <Link to={`/analysis/${latestAnalysis._id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Analysis Report
              </Button>
            </Link>
            <Link to="/analysis/new" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto justify-center">
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Upload New
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteActiveResume}
              isLoading={deleting}
              className="w-full sm:w-auto justify-center"
              title="Permanently remove this resume from database"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ) : !loadingAnalysis ? (
        <div className="group relative bg-card text-card-foreground rounded-2xl border border-dashed border-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">No Resume Uploaded Yet</h4>
              <p className="text-xs text-muted-foreground">Upload your resume once to get your score and track progress over time.</p>
            </div>
          </div>
          <Link to="/analysis/new" className="relative z-10">
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
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-border">
              <span className="text-muted-foreground">Name</span>
              <span className="font-semibold text-foreground">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-border">
              <span className="text-muted-foreground">Email</span>
              <span className="font-semibold text-foreground">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-border">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs text-muted-foreground truncate max-w-[150px]">{user?._id}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active
              </span>
            </div>
          </div>
        </Card>

        <Card title="Next Steps" subtitle="Core closr pipeline" className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/profile"
              className="group relative p-4 rounded-xl border border-border bg-card hover:bg-muted transition-all block shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors relative z-10">
                1. Profile & Target Role
              </h4>
              <p className="text-xs text-muted-foreground mt-1 relative z-10">
                Configure your target role and current skills to tailor gap analysis.
              </p>
            </Link>

            <Link
              to="/analysis/new"
              className="group relative p-4 rounded-xl border border-border bg-card hover:bg-muted transition-all block shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors relative z-10">
                2. AI Skill-Gap Analysis
              </h4>
              <p className="text-xs text-muted-foreground mt-1 relative z-10">
                Upload your resume (PDF/DOCX) to get an ATS match score and pinpoint missing skills.
              </p>
            </Link>

            <Link
              to="/roadmap"
              className="group relative p-4 rounded-xl border border-border bg-card hover:bg-muted transition-all block shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
                  <Map className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors relative z-10">
                3. 12-Week Roadmap & Progress
              </h4>
              <p className="text-xs text-muted-foreground mt-1 relative z-10">
                Follow milestone tasks with 1 curated resource and monitor weekly completion.
              </p>
            </Link>

            <Link
              to="/history"
              className="group relative p-4 rounded-xl border border-border bg-card hover:bg-muted transition-all block shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors relative z-10">
                4. Re-analysis Loop & Compare
              </h4>
              <p className="text-xs text-muted-foreground mt-1 relative z-10">
                Re-upload updated resumes to track score improvement charts and export ATS PDFs.
              </p>
            </Link>
          </div>
        </Card>
      </div>

      {/* In-App PDF Viewer Modal */}
      {showPdfModal && latestAnalysis && (
        <PdfViewerModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          title={latestAnalysis.fileName || 'Uploaded_Resume.pdf'}
          targetRole={latestAnalysis.targetRole}
          score={latestAnalysis.matchScore}
          analysisId={latestAnalysis._id}
          hasOriginalPdf={latestAnalysis.hasOriginalPdf}
          rawResumeText={latestAnalysis.resumeText || ''}
        />
      )}
    </div>
  );
};

export default DashboardPage;
