import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Layers,
  Award,
  Edit3,
  Save,
  Plus,
  Trash2,
  X,
  ExternalLink,
  Columns,
  Briefcase,
  ChevronDown,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import resumeService from '../../../services/resumeService.js';
import analysisService from '../../../services/analysisService.js';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';

const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern Tech',
    badge: 'Popular for Software & Tech',
    fontFamily: 'font-sans',
    description: 'Clean sans-serif typography, subtle divider lines, optimal ATS readability.'
  },
  {
    id: 'classic',
    name: 'Classic Ivy / Harvard',
    badge: 'Standard Corporate & Finance',
    fontFamily: 'font-serif',
    description: 'Traditional serif typography, centered header, bold uppercase section dividers.'
  },
  {
    id: 'compact',
    name: 'Minimalist Compact',
    badge: 'Dense 1-Page Optimization',
    fontFamily: 'font-sans',
    description: 'Tighter line-height and compact margins, designed to fit into a single page.'
  }
];

export const ResumeGeneratorPage = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const analysisId = searchParams.get('analysisId');
  const navigate = useNavigate();

  const [resume, setResume] = useState(null);
  const [allResumes, setAllResumes] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [availableAnalyses, setAvailableAnalyses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // View modes: 'preview' | 'split' | 'original' | 'code'
  const [viewMode, setViewMode] = useState('preview');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');

  // Live Interactive Editing (Google Docs / Notion style)
  const [isEditing, setIsEditing] = useState(false);
  const [editableHtml, setEditableHtml] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const resumeRef = useRef(null);

  // Tailor for specific job opening modal
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [tailorForm, setTailorForm] = useState({
    companyName: '',
    targetRole: '',
    jobDescription: '',
    baseAnalysisId: ''
  });
  const [tailoring, setTailoring] = useState(false);

  // Load user resumes and analyses list
  const loadLists = async () => {
    try {
      const [rRes, aRes] = await Promise.all([
        resumeService.getResumes(),
        analysisService.getAnalyses()
      ]);
      if (rRes.success) setAllResumes(rRes.data?.resumes || []);
      if (aRes.success) setAvailableAnalyses(aRes.data?.analyses || []);
    } catch (err) {
      console.error('Error fetching resume lists', err);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  // Fetch or generate ATS resume
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
            setEditableHtml(res.data.resume.html);
            setSelectedTemplate(res.data.resume.template || 'modern');
            navigate(`/resume/${res.data.resume._id}`);
            toast.success('ATS Resume generated successfully!');
          }
        } else if (isObjectId) {
          // Load specific resume by ID
          const res = await resumeService.getResumeById(id);
          if (res.success && res.data?.resume) {
            setResume(res.data.resume);
            setEditableHtml(res.data.resume.html);
            setSelectedTemplate(res.data.resume.template || 'modern');

            // Fetch analysis details to check original PDF file
            if (res.data.resume.analysisId) {
              const aRes = await analysisService.getAnalysisById(res.data.resume.analysisId);
              if (aRes.success) {
                setCurrentAnalysis(aRes.data?.analysis);
              }
            }
          }
        } else {
          // List user resumes
          const res = await resumeService.getResumes();
          if (res.success && res.data?.resumes?.length > 0) {
            navigate(`/resume/${res.data.resumes[0]._id}`, { replace: true });
          } else {
            // No resume generated yet: fetch analyses
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
        setEditableHtml(res.data.resume.html);
        setSelectedTemplate(res.data.resume.template || 'modern');
        navigate(`/resume/${res.data.resume._id}`);
        toast.success('ATS Resume generated successfully!');
        loadLists();
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

      const blob = new Blob([res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadName = resume.companyName
        ? `Resume_${resume.companyName.replace(/\s+/g, '_')}_${resume._id}.pdf`
        : `CareerPilot_ATS_Resume_${resume._id}.pdf`;
      link.setAttribute('download', downloadName);
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
    const htmlToCopy = resumeRef.current ? resumeRef.current.innerHTML : (editableHtml || resume?.html);
    if (!htmlToCopy) return;
    navigator.clipboard.writeText(htmlToCopy);
    setCopied(true);
    toast.success('HTML copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Live Interactive Editing Handlers
  const handleToggleEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
      toast('Click directly anywhere on the document to edit text.', { icon: '✏️' });
    } else {
      setIsEditing(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!resume) return;
    try {
      setIsSavingEdit(true);
      const finalHtml = resumeRef.current ? resumeRef.current.innerHTML : editableHtml;
      const res = await resumeService.updateResume(resume._id, {
        html: finalHtml,
        template: selectedTemplate
      });

      if (res.success && res.data?.resume) {
        setResume(res.data.resume);
        setEditableHtml(res.data.resume.html);
        setIsEditing(false);
        toast.success('Resume updated! Live PDF export is ready.');
      }
    } catch (err) {
      toast.error('Failed to save edits.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdits = () => {
    if (resume?.html) {
      setEditableHtml(resume.html);
      if (resumeRef.current) {
        resumeRef.current.innerHTML = resume.html;
      }
    }
    setIsEditing(false);
    toast('Changes discarded.');
  };

  const handleTemplateChange = async (templateId) => {
    setSelectedTemplate(templateId);
    if (resume) {
      try {
        await resumeService.updateResume(resume._id, { template: templateId });
      } catch (err) {
        // Silently update locally
      }
    }
  };

  // Tailor for specific job opening submit
  const handleTailorSubmit = async (e) => {
    e.preventDefault();
    if (!tailorForm.targetRole.trim()) {
      toast.error('Please enter a target role.');
      return;
    }
    const baseId = tailorForm.baseAnalysisId || resume?.analysisId || availableAnalyses[0]?._id;
    if (!baseId) {
      toast.error('Please select an uploaded resume to use as a base.');
      return;
    }

    try {
      setTailoring(true);
      const res = await resumeService.tailorResume({
        baseAnalysisId: baseId,
        companyName: tailorForm.companyName.trim() || 'Custom Application',
        targetRole: tailorForm.targetRole.trim(),
        jobDescription: tailorForm.jobDescription.trim()
      });

      if (res.success && res.data?.resume) {
        toast.success(`Tailored ATS resume created for ${tailorForm.companyName || tailorForm.targetRole}!`);
        setShowTailorModal(false);
        setTailorForm({ companyName: '', targetRole: '', jobDescription: '', baseAnalysisId: '' });
        setResume(res.data.resume);
        setEditableHtml(res.data.resume.html);
        navigate(`/resume/${res.data.resume._id}`);
        loadLists();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to tailor resume.');
    } finally {
      setTailoring(false);
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 text-center">
        <Loader
          size="lg"
          text={
            generating
              ? 'Gemini AI is rewriting your resume into ATS-compliant HTML...'
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
      </div>
    );
  }

  // Template specific class styles
  const templateClassMap = {
    modern: 'modern-template font-sans',
    classic: 'classic-template font-serif',
    compact: 'compact-template font-sans leading-snug'
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Back Button, Breadcrumb & Action to Tailor for New Opening */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back</span>
          </button>

          {resume?.analysisId && (
            <Link
              to={`/analysis/${resume.analysisId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Back to Analysis Report</span>
            </Link>
          )}
        </div>

        {/* Tailor for Specific Job Opening Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setTailorForm((prev) => ({
              ...prev,
              baseAnalysisId: resume.analysisId || availableAnalyses[0]?._id || ''
            }));
            setShowTailorModal(true);
          }}
          className="shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
          <span>+ Tailor for New Job Opening</span>
        </Button>
      </div>

      {/* Multiple Resumes Switcher Shelf */}
      {allResumes.length > 1 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              Your Tailored Resumes & Openings ({allResumes.length})
            </span>
            <span className="text-[11px] text-slate-400">Click any card to switch versions without disrupting others</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {allResumes.map((r) => {
              const isActive = r._id === resume._id;
              return (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => navigate(`/resume/${r._id}`)}
                  className={`px-3 py-2 rounded-lg text-left text-xs shrink-0 border transition-all ${
                    isActive
                      ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-200'
                      : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 truncate max-w-[180px]">
                    {r.companyName || 'General Application'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                    {r.targetRole || 'Target Role'} • {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-xs mb-1 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ATS Resume Generator (Feature 8)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {resume.companyName && resume.companyName !== 'General Application' ? `${resume.companyName} Resume` : 'ATS-Optimized Resume'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Target Role: <strong className="text-slate-700">{resume.targetRole || currentAnalysis?.targetRole || 'Target Position'}</strong></span>
            <span>•</span>
            <span>Print-ready A4 with 15mm margins</span>
          </p>
        </div>

        {/* Primary Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Edit Mode Button */}
          {isEditing ? (
            <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-lg border border-amber-200">
              <button
                type="button"
                onClick={handleCancelEdits}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdits}
                isLoading={isSavingEdit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                Save Changes
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleEdit}
              className="text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              <span>Edit Resume Directly</span>
            </Button>
          )}

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

      {/* Editing Banner Notification */}
      {isEditing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs text-amber-900 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-md bg-amber-200 text-amber-900">
              <Edit3 className="w-4 h-4" />
            </span>
            <div>
              <strong className="font-bold">Live Interactive Editing Active (Google Docs Style):</strong> Click directly on any text or bullet point inside the resume preview to edit. Click <strong>"Save Changes"</strong> when done to update your PDF.
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveEdits}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 transition-colors shadow-2xs"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Control Strip: 1) Recruiter Templates & 2) View Modes (Split / Original / ATS) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Recruiter-Approved Styles Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Style:</span>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleTemplateChange(tmpl.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedTemplate === tmpl.id
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={tmpl.description}
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher: Full ATS | Side-by-Side (Compare) | Original Uploaded PDF */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">View:</span>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              ATS Preview
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'split' ? 'bg-white text-slate-900 shadow-sm font-bold text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compare Original Uploaded Resume vs ATS Version"
            >
              <Columns className="w-3.5 h-3.5" />
              Side-by-Side (Compare)
            </button>

            <button
              type="button"
              onClick={() => setViewMode('original')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'original' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View original uploaded PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              Original Uploaded PDF
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
        </div>
      </div>

      {/* ATS Compliance Checklist Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">100% Single-Column</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">Standard ATS Headings</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">Role-Targeted Keywords</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">15mm Margins (Print-Ready)</span>
        </div>
      </div>

      {/* Main Resume Presentation Canvas */}
      {viewMode === 'split' ? (
        /* Side-by-Side Comparison: Left = Original PDF, Right = ATS Optimized */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Original Uploaded Resume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Original Uploaded Resume ({currentAnalysis?.fileName || 'Uploaded_Resume.pdf'})
              </span>
              {currentAnalysis && (
                <span className="text-xs font-semibold text-slate-500">
                  Match Score: {currentAnalysis.matchScore}%
                </span>
              )}
            </div>

            <Card className="p-0 overflow-hidden border-slate-300 shadow-md h-[900px] flex flex-col bg-slate-100">
              {currentAnalysis?._id ? (
                <iframe
                  src={resumeService.getOriginalPdfUrl(currentAnalysis._id)}
                  className="w-full h-full border-none"
                  title="Original Uploaded PDF"
                />
              ) : (
                <div className="p-6 text-xs text-slate-600 overflow-y-auto font-mono whitespace-pre-wrap">
                  {currentAnalysis?.resumeText || 'Original resume text preview...'}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: ATS Optimized Resume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                ATS-Optimized Version ({TEMPLATES.find((t) => t.id === selectedTemplate)?.name})
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ATS Pass Guaranteed
              </span>
            </div>

            <Card className="p-0 overflow-hidden border-slate-300 shadow-md h-[900px] flex flex-col bg-slate-100 overflow-y-auto">
              <div className="p-6 bg-slate-100 flex justify-center min-h-full">
                <div className="w-full bg-white shadow-lg rounded-sm p-6 sm:p-10 border border-slate-200 text-slate-900">
                  <div
                    ref={resumeRef}
                    contentEditable={isEditing}
                    suppressContentEditableWarning={true}
                    onInput={(e) => setEditableHtml(e.currentTarget.innerHTML)}
                    className={`resume-html-preview prose prose-slate max-w-none text-slate-900 ${templateClassMap[selectedTemplate]} ${
                      isEditing ? 'ring-2 ring-indigo-400 ring-offset-2 cursor-text' : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: editableHtml }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : viewMode === 'original' ? (
        /* Original Uploaded PDF Full Screen View */
        <Card className="shadow-lg p-0 overflow-hidden border-slate-300 bg-slate-100">
          <div className="p-3 bg-slate-200/80 border-b border-slate-300 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Original Uploaded File: {currentAnalysis?.fileName || 'Uploaded_Resume.pdf'}</span>
            <a
              href={resumeService.getOriginalPdfUrl(resume.analysisId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
            >
              <span>Open in new tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="h-[850px] w-full">
            <iframe
              src={resumeService.getOriginalPdfUrl(resume.analysisId)}
              className="w-full h-full border-none"
              title="Original Uploaded PDF"
            />
          </div>
        </Card>
      ) : viewMode === 'code' ? (
        /* Raw HTML Code View */
        <Card className="shadow-lg p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="p-4 text-slate-100 overflow-x-auto font-mono text-xs max-h-[800px]">
            <pre>{editableHtml || resume.html}</pre>
          </div>
        </Card>
      ) : (
        /* Standard Full A4 ATS Preview */
        <Card className="shadow-lg p-0 overflow-hidden bg-white border-slate-300">
          <div className="p-4 sm:p-8 bg-slate-100 flex justify-center">
            {/* Standard A4 Paper Aspect Ratio Container */}
            <div className="w-full max-w-3xl bg-white shadow-xl rounded-sm p-6 sm:p-12 border border-slate-200 min-h-[850px]">
              <div
                ref={resumeRef}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                onInput={(e) => setEditableHtml(e.currentTarget.innerHTML)}
                className={`resume-html-preview prose prose-slate max-w-none text-slate-900 ${templateClassMap[selectedTemplate]} ${
                  isEditing ? 'ring-2 ring-indigo-400 ring-offset-2 cursor-text' : ''
                }`}
                dangerouslySetInnerHTML={{ __html: editableHtml }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tailor for New Job Opening Modal */}
      {showTailorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tailor Resume for a Job Opening</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a dedicated ATS resume customized for a specific company opening without disrupting your other resumes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTailorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTailorSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Company / Opening Name *
                </label>
                <input
                  type="text"
                  required
                  value={tailorForm.companyName}
                  onChange={(e) => setTailorForm({ ...tailorForm, companyName: e.target.value })}
                  placeholder="e.g. Zepto, Google, Stripe, or Senior SDE Role"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Role Title *
                </label>
                <input
                  type="text"
                  required
                  value={tailorForm.targetRole}
                  onChange={(e) => setTailorForm({ ...tailorForm, targetRole: e.target.value })}
                  placeholder="e.g. Full Stack Developer, Backend Engineer"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Base Resume to Use
                </label>
                <select
                  value={tailorForm.baseAnalysisId}
                  onChange={(e) => setTailorForm({ ...tailorForm, baseAnalysisId: e.target.value })}
                  className="w-full text-xs px-2.5 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  {availableAnalyses.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.fileName || 'Uploaded Resume'} ({a.targetRole} • Score {a.matchScore}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Paste Job Description (Optional but recommended)
                </label>
                <textarea
                  rows={4}
                  value={tailorForm.jobDescription}
                  onChange={(e) => setTailorForm({ ...tailorForm, jobDescription: e.target.value })}
                  placeholder="Paste the LinkedIn or Indeed job description here. Gemini AI will match its exact technical keywords..."
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTailorModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={tailoring}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate Tailored Resume
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeGeneratorPage;
