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
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import resumeService from '../../../services/resumeService.js';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';

export const ResumeGeneratorPage = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const analysisId = searchParams.get('analysisId');
  const navigate = useNavigate();

  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'code'

  useEffect(() => {
    const fetchOrCreate = async () => {
      try {
        setLoading(true);

        if (id) {
          const res = await resumeService.getResumeById(id);
          if (res.success && res.data?.resume) {
            setResume(res.data.resume);
          }
        } else if (analysisId) {
          setGenerating(true);
          const res = await resumeService.generateResume(analysisId);
          if (res.success && res.data?.resume) {
            setResume(res.data.resume);
            navigate(`/resume/${res.data.resume._id}`, { replace: true });
            toast.success('ATS Resume generated successfully!');
          }
        } else {
          // List user resumes
          const res = await resumeService.getResumes();
          if (res.success && res.data?.resumes?.length > 0) {
            navigate(`/resume/${res.data.resumes[0]._id}`, { replace: true });
          } else {
            navigate('/analysis/new');
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
      <div className="max-w-md mx-auto py-16 text-center">
        <h3 className="text-lg font-bold text-slate-800">No Generated Resume Found</h3>
        <p className="text-sm text-slate-500 mt-1">Run an analysis first to generate an ATS resume.</p>
        <Link to="/analysis/new" className="mt-4 inline-block">
          <Button variant="primary">Start Analysis</Button>
        </Link>
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
