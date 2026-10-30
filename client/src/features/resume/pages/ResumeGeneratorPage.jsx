import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Copy,
  Check,
  Eye,
  Code,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Layers,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import resumeService from '../../../services/resumeService.js';
import analysisService from '../../../services/analysisService.js';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';

export const ResumeGeneratorPage = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const analysisId = searchParams.get('analysisId');
  const navigate = useNavigate();

  const [resume, setResume] = useState(null);
  const [availableAnalyses, setAvailableAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'code'

  useEffect(() => {
    const fetchOrCreate = async () => {
      try {
        setLoading(true);

        const isObjectId = id && id !== 'generate' && id !== 'new' && /^[0-9a-fA-F]{24}$/.test(id);

        if (analysisId) {
          // Generate new ATS resume for given analysis
          setGenerating(true);
          const res = await resumeService.generateResume(analysisId);
          if (res.success && res.data?.resume) {
            setResume(res.data.resume);
            navigate(`/resume/${res.data.resume._id}`, { replace: true });
            toast.success('ATS Resume generated successfully!');
          }
        } else if (isObjectId) {
          // Load specific resume by ID
          const res = await resumeService.getResumeById(id);
          if (res.success && res.data?.resume) {
            setResume(res.data.resume);
          }
        } else {
          // List user resumes
          const res = await resumeService.getResumes();
          if (res.success && res.data?.resumes?.length > 0) {
            navigate(`/resume/${res.data.resumes[0]._id}`, { replace: true });
          } else {
            // No resume generated yet: fetch past analyses so user can pick one or create new
            const aRes = await analysisService.getAnalyses();
            if (aRes.success) {
              setAvailableAnalyses(aRes.data?.analyses || []);
            }
            setResume(null);
          }
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load resume.');
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    };

    fetchOrCreate();
  }, [id, analysisId, navigate]);

  const handleGenerateResume = async (targetAnalysisId) => {
    try {
      setGenerating(true);
      const res = await resumeService.generateResume(targetAnalysisId);
      if (res.success && res.data?.resume) {
        setResume(res.data.resume);
        navigate(`/resume/${res.data.resume._id}`, { replace: true });
        toast.success('ATS Resume generated successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate resume. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!resume) return;

    try {
      setDownloading(true);
      const res = await resumeService.downloadPdf(resume._id);

      // Create download link for blob response
      const blob = new Blob([res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CareerPilot_ATS_Resume_${resume._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyHtml = () => {
    if (!resume?.html) return;
    navigator.clipboard.writeText(resume.html);
    setCopied(true);
    toast.success('HTML copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading || generating) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 text-center">
        <Loader
          size="lg"
          text={
            generating
              ? 'Gemini AI is rewriting your resume into ATS-friendly HTML...'
              : 'Loading your resume...'
          }
        />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ATS Resume Generator (Feature 8)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ATS-Friendly Resume Optimizer
          </h1>
          <p className="text-base text-slate-600">
            Reorganize your resume into a clean, recruiter-approved, single-column format that passes automated Applicant Tracking Systems and exports directly to PDF.
          </p>
        </div>

        {/* Existing Analyses with 1-Click Generation */}
        {availableAnalyses.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Select an Analysis to Generate ATS Resume</h2>
                <p className="text-xs text-slate-500">Pick any past analysis to generate an ATS-optimized resume version.</p>
              </div>
              <Link to="/analysis/new">
                <Button variant="outline" size="sm">
                  + New Analysis
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableAnalyses.map((a) => (
                <Card key={a._id} className="p-5 hover:border-indigo-300 transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{a.targetRole || 'Target Role Analysis'}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        {a.fileName && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600 truncate max-w-[160px]">
                              <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{a.fileName}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      <span>Score: {a.matchScore}%</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-emerald-600">
                      {a.matchedSkills?.length || 0} matched skills
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-rose-600">
                      {a.missingSkills?.length || 0} missing
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link to={`/analysis/${a._id}`} className="text-xs text-slate-500 hover:text-indigo-600 font-medium">
                      View Analysis →
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGenerateResume(a._id)}
                      isLoading={generating}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Generate ATS Resume
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="text-center p-8 bg-gradient-to-b from-indigo-50/50 to-white border-dashed border-2 border-indigo-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-4">No ATS Resume Generated Yet</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
              Upload your resume for AI skill-gap analysis. Once analyzed, you can convert it into an ATS-compliant PDF with one click.
            </p>
            <div className="mt-6">
              <Link to="/analysis/new">
                <Button variant="primary" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Resume First
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card className="p-5 border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Single-Column Hierarchy</h4>
            <p className="text-xs text-slate-600 mt-1">
              Guaranteed readability across Workday, Greenhouse, Taleo, and Lever without parser column-swapping errors.
            </p>
          </Card>

          <Card className="p-5 border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Code className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Semantic Clean HTML</h4>
            <p className="text-xs text-slate-600 mt-1">
              Standard recruiter headings: Summary, Skills, Experience, Projects, and Education with print-friendly inline CSS.
            </p>
          </Card>

          <Card className="p-5 border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Headless PDF Export</h4>
            <p className="text-xs text-slate-600 mt-1">
              One-click PDF download generated directly by Puppeteer with standard A4 format and 15mm margins.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-xs mb-1 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ATS Resume Generator (Feature 8)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ATS-Friendly Resume Preview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Semantic single-column HTML, standard ATS headings, print-ready with 15mm margins.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              HTML
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleCopyHtml}>
            {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copied ? 'Copied' : 'Copy HTML'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={downloading}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Preview Container */}
      <Card className="shadow-lg p-0 overflow-hidden bg-white border-slate-300">
        {viewMode === 'preview' ? (
          <div className="p-4 sm:p-8 bg-slate-100 flex justify-center">
            {/* Standard A4 Paper Aspect Ratio Container */}
            <div className="w-full max-w-3xl bg-white shadow-xl rounded-sm p-6 sm:p-12 border border-slate-200 min-h-[800px]">
              <div
                className="resume-html-preview prose prose-slate max-w-none text-slate-900"
                dangerouslySetInnerHTML={{ __html: resume.html }}
              />
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900 text-slate-100 overflow-x-auto font-mono text-xs max-h-[700px]">
            <pre>{resume.html}</pre>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ResumeGeneratorPage;

