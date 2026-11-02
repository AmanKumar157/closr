import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Map,
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Briefcase,
  Layers,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import analysisService from '../../../services/analysisService.js';
import ScoreGauge from '../../../components/common/ScoreGauge.jsx';
import SkillChip from '../../../components/common/SkillChip.jsx';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';
import PdfViewerModal from '../../../components/common/PdfViewerModal.jsx';

export const AnalysisResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResumeText, setShowResumeText] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const handleCopyResumeText = () => {
    if (!analysis?.resumeText) return;
    navigator.clipboard.writeText(analysis.resumeText);
    setCopiedText(true);
    toast.success('Extracted resume text copied to clipboard!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDeleteAnalysis = async () => {
    if (!analysis) return;
    const name = analysis.fileName || analysis.targetRole;
    if (!window.confirm(`Permanently delete "${name}"? This will completely remove this resume analysis, all its ATS resumes, and 12-week roadmaps from your account.`)) return;

    try {
      const res = await analysisService.deleteAnalysis(analysis._id);
      if (res.success) {
        toast.success('Resume and all associated data completely removed from app.');
        navigate('/history');
      }
    } catch (err) {
      toast.error('Failed to delete analysis.');
    }
  };

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const res = await analysisService.getAnalysisById(id);
        if (res.success && res.data?.analysis) {
          setAnalysis(res.data.analysis);
        }
      } catch (err) {
        toast.error('Could not find requested analysis report.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader size="lg" text="Loading your ATS skill-gap report..." />
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const highImportanceGaps = analysis.missingSkills?.filter((m) => m.importance === 'high') || [];
  const mediumImportanceGaps = analysis.missingSkills?.filter((m) => m.importance === 'medium') || [];
  const lowImportanceGaps = analysis.missingSkills?.filter((m) => m.importance === 'low') || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <Link
          to="/dashboard"
          className="text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-slate-300">/</span>
        <Link
          to="/history"
          className="text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          Analyses
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800 truncate max-w-xs">
          {analysis.targetRole}
        </span>
      </div>

      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-xs mb-1 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Resume Gap Report</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <span>{analysis.targetRole}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Analyzed on {new Date(analysis.createdAt).toLocaleDateString()}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/analysis/new">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Analyze Another
            </Button>
          </Link>
          <Link to={`/resume?analysisId=${analysis._id}`}>
            <Button variant="outline" size="sm">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
              Generate ATS Resume
            </Button>
          </Link>
          <Link to={`/roadmap?analysisId=${analysis._id}`}>
            <Button variant="primary" size="sm">
              <Map className="w-3.5 h-3.5 mr-1.5" />
              Generate 12-Week Roadmap
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAnalysis}
            className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300"
            title="Permanently remove this resume analysis and all associated ATS resumes & roadmaps"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
            Delete Resume
          </Button>
        </div>
      </div>

      {/* Uploaded Resume File Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                {analysis.fileName || 'Uploaded_Resume.pdf'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 uppercase">
                {analysis.fileName?.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF'}
              </span>
              {analysis.fileSize > 0 && (
                <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                  ({(analysis.fileSize / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-2">
              <span>Extracted {analysis.resumeText ? analysis.resumeText.split(/\s+/).filter(Boolean).length : 0} words</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{analysis.extractedSkills?.length || 0} skills identified</span>
              <span>•</span>
              <span>Ready for ATS screening</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPdfModal(true)}
            className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            <span>Open in PDF Viewer</span>
          </Button>

          {analysis.hasOriginalPdf && (
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/analysis/${analysis._id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 rounded-lg shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
              <span>New Tab</span>
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResumeText(!showResumeText)}
          >
            {showResumeText ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
            {showResumeText ? 'Hide Extracted Text' : 'View Extracted Text'}
          </Button>
        </div>
      </div>

      {/* Expandable Extracted Resume Text Drawer */}
      {showResumeText && (
        <Card
          title="Extracted Document Content"
          subtitle="Full text extracted from your uploaded file and evaluated by Gemini AI"
          className="border-indigo-200 bg-slate-50/50 shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
              <span>{analysis.resumeText?.length || 0} characters parsed</span>
              <button
                type="button"
                onClick={handleCopyResumeText}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800 font-mono text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-inner">
              {analysis.resumeText}
            </div>
          </div>
        </Card>
      )}

      {/* Overview Score & Key Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge Card */}
        <Card className="flex flex-col items-center justify-center p-6 text-center shadow-sm">
          <ScoreGauge score={analysis.matchScore} size="lg" label="ATS Readiness Score" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-3 max-w-xs">
            Reflects candidate alignment with technical competencies, tooling, and expected domain expertise.
          </p>
        </Card>

        {/* Quick Breakdown Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Matched Skills
              </span>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {analysis.matchedSkills?.length || 0}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
              Skills from your resume verified against the role.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Missing Skill Gaps
              </span>
              <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                {analysis.missingSkills?.length || 0}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
              <span className="font-semibold text-red-600 dark:text-red-400">{highImportanceGaps.length}</span> high-priority missing items.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Extracted Skills
              </span>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {analysis.extractedSkills?.length || 0}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
              Technical terms parsed directly from your document.
            </p>
          </div>
        </div>
      </div>

      {/* Skill Gaps Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing Skills by Priority */}
        <Card
          title="Missing Skills (The Gaps)"
          subtitle="Skills expected for the target role that were not found in your resume"
        >
          <div className="space-y-4">
            {highImportanceGaps.length > 0 && (
              <div>
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  High Priority Gaps ({highImportanceGaps.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {highImportanceGaps.map((m) => (
                    <SkillChip key={m.skill} skill={m.skill} variant="high" />
                  ))}
                </div>
              </div>
            )}

            {mediumImportanceGaps.length > 0 && (
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Medium Priority Gaps ({mediumImportanceGaps.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {mediumImportanceGaps.map((m) => (
                    <SkillChip key={m.skill} skill={m.skill} variant="medium" />
                  ))}
                </div>
              </div>
            )}

            {lowImportanceGaps.length > 0 && (
              <div>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Low Priority / Nice-to-Have ({lowImportanceGaps.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {lowImportanceGaps.map((m) => (
                    <SkillChip key={m.skill} skill={m.skill} variant="low" />
                  ))}
                </div>
              </div>
            )}

            {(!analysis.missingSkills || analysis.missingSkills.length === 0) && (
              <p className="text-sm text-emerald-600 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> No critical skill gaps detected! Your resume matches the requirements.
              </p>
            )}
          </div>
        </Card>

        {/* Matched Skills */}
        <Card
          title="Matched Skills"
          subtitle="Skills found in your resume that fulfill target role requirements"
        >
          <div className="flex flex-wrap gap-2">
            {analysis.matchedSkills?.map((skill) => (
              <SkillChip key={skill} skill={skill} variant="matched" />
            ))}
            {(!analysis.matchedSkills || analysis.matchedSkills.length === 0) && (
              <p className="text-sm text-slate-400 italic">No direct skill matches detected.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Weak Sections and Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Sections */}
        <Card title="Identified Weak Areas" subtitle="Sections where ATS parsers or recruiters may deduct points">
          <ul className="space-y-3">
            {analysis.weakSections?.map((section, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-zinc-300">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{section}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Suggestions */}
        <Card title="Actionable AI Recommendations" subtitle="Immediate improvements to elevate your interview call rate">
          <ul className="space-y-3">
            {analysis.suggestions?.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-zinc-300">
                <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Extracted Skills Reference */}
      <Card title="All Skills Parsed from Document" subtitle="Complete inventory of skills recognized by the ATS extractor">
        <div className="flex flex-wrap gap-1.5">
          {analysis.extractedSkills?.map((skill) => (
            <SkillChip key={skill} skill={skill} variant="neutral" size="sm" />
          ))}
        </div>
      </Card>

      {/* Call to Action Banner (Bridge to Phase 4 Roadmap) */}
      <div className="bg-gradient-to-r from-indigo-900 to-violet-900 rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Map className="w-4 h-4 text-emerald-400" />
            <span>Bridge the Gap (Feature 5)</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">
            Ready to turn these gaps into a structured learning roadmap?
          </h3>
          <p className="text-indigo-200 text-sm">
            Generate a personalized 12-week roadmap targeting your {highImportanceGaps.length} high-importance missing skills with exactly one verified resource per milestone.
          </p>
        </div>
        <Link to={`/roadmap?analysisId=${analysis._id}`}>
          <Button variant="primary" size="lg" className="bg-white text-indigo-900 hover:bg-indigo-50 shadow-md min-w-[200px]">
            <Map className="w-4 h-4 mr-2 text-indigo-600" />
            Create 12-Week Roadmap
          </Button>
        </Link>
      </div>

      {/* PDF Viewer Modal */}
      {showPdfModal && (
        <PdfViewerModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          title={analysis.fileName || 'Uploaded_Resume.pdf'}
          targetRole={analysis.targetRole}
          score={analysis.matchScore}
          analysisId={analysis._id}
          hasOriginalPdf={analysis.hasOriginalPdf}
          rawResumeText={analysis.resumeText || ''}
        />
      )}
    </div>
  );
};

export default AnalysisResultPage;

