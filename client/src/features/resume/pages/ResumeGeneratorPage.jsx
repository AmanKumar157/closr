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
  AlertCircle,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import resumeService from '../../../services/resumeService.js';
import analysisService from '../../../services/analysisService.js';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';
import PdfViewerModal from '../../../components/common/PdfViewerModal.jsx';

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
  const [showAllResumes, setShowAllResumes] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [availableAnalyses, setAvailableAnalyses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // View modes: 'preview' (A4 PDF layout) | 'native' (Browser PDF stream) | 'split' | 'original' | 'code'
  const [viewMode, setViewMode] = useState('preview');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [zoom, setZoom] = useState(100);
  const [pdfModalData, setPdfModalData] = useState(null);

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
              const analysisObj = typeof res.data.resume.analysisId === 'object'
                ? res.data.resume.analysisId
                : null;
              const rawAId = analysisObj ? analysisObj._id : res.data.resume.analysisId;

              if (analysisObj) {
                setCurrentAnalysis(analysisObj);
              }

              if (rawAId && /^[0-9a-fA-F]{24}$/.test(rawAId)) {
                try {
                  const aRes = await analysisService.getAnalysisById(rawAId);
                  if (aRes.success && aRes.data?.analysis) {
                    setCurrentAnalysis((prev) => ({
                      ...(prev || {}),
                      ...aRes.data.analysis
                    }));
                  }
                } catch (e) {
                  // Silently ignore if already populated
                }
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

  const handleDeleteResumeCard = async (e, resumeId) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Permanently remove this resume from your app? This will completely delete this resume, its AI analysis report, and roadmap.')) return;
    try {
      const res = await resumeService.deleteResume(resumeId, true);
      if (res.success) {
        toast.success('Resume and all associated data completely removed from app.');
        const remaining = allResumes.filter((x) => x._id !== resumeId);
        setAllResumes(remaining);
        await loadLists();
        if (resume?._id === resumeId) {
          if (remaining.length > 0) {
            navigate(`/resume/${remaining[0]._id}`);
          } else {
            setResume(null);
            setCurrentAnalysis(null);
            navigate('/resume', { replace: true });
          }
        }
      }
    } catch (err) {
      toast.error('Failed to delete resume.');
    }
  };

  const handleDeleteAnalysisCard = async (analysisIdToDelete, name) => {
    if (!window.confirm(`Permanently remove "${name}" from your app? This will completely delete this resume analysis and any roadmaps from the database.`)) return;
    try {
      const res = await analysisService.deleteAnalysis(analysisIdToDelete);
      if (res.success) {
        toast.success('Resume analysis completely removed from database.');
        setAvailableAnalyses((prev) => prev.filter((x) => x._id !== analysisIdToDelete));
        await loadLists();
      }
    } catch (err) {
      toast.error('Failed to delete analysis.');
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

  if (!resume || showAllResumes) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Return Button if a resume is currently selected */}
        {resume && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setShowAllResumes(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-2xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Return to Active Resume ({resume.companyName || currentAnalysis?.fileName || 'Resume'})</span>
            </button>
            <span className="text-xs text-slate-500 font-medium">Select any resume below to open it</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ATS Resume Generator (Feature 8)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Your Tailored & Master ATS Resumes
          </h1>
          <p className="text-base text-slate-600">
            Select a tailored resume to view and export, or generate an ATS-optimized version from any of your analyzed resumes.
          </p>
        </div>

        {/* Section 1: All User Resumes */}
        {allResumes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your Resumes & Openings ({allResumes.length})</h2>
                <p className="text-xs text-slate-500">Pick any resume version to edit, preview, or export to PDF.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allResumes.map((r) => {
                const isActive = r._id === resume?._id;
                const displayName =
                  r.companyName && r.companyName !== 'General Application' && r.companyName !== 'Target Role'
                    ? r.companyName
                    : (r.analysisId?.fileName || currentAnalysis?.fileName || 'Uploaded Resume');
                const displayRole =
                  r.targetRole && r.targetRole !== 'Target Role'
                    ? r.targetRole
                    : (r.analysisId?.targetRole || currentAnalysis?.targetRole || 'Software Developer');

                return (
                  <Card
                    key={r._id}
                    className={`p-5 hover:border-indigo-300 transition-all shadow-sm ${
                      isActive ? 'ring-2 ring-indigo-300 border-indigo-500 bg-indigo-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
                              Active
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{displayName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{displayRole}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteResumeCard(e, r._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete this resume"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">A4 • Single Column ATS</span>
                      <Button
                        variant={isActive ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => {
                          setResume(r);
                          setShowAllResumes(false);
                          navigate(`/resume/${r._id}`);
                        }}
                      >
                        <span>{isActive ? 'Resume Active →' : 'Open Resume →'}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Existing Analyses with 1-Click Generation */}
        {availableAnalyses.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Generate ATS Resume from Analysis</h2>
                <p className="text-xs text-slate-500">Pick any past resume analysis to convert it into an ATS-compliant PDF.</p>
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

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setPdfModalData({
                            title: a.fileName || `${a.targetRole} Resume`,
                            targetRole: a.targetRole,
                            score: a.matchScore,
                            analysisId: a._id,
                            hasOriginalPdf: a.hasOriginalPdf,
                            rawResumeText: a.resumeText || ''
                          })
                        }
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                        title="Open this resume in full PDF viewer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        Preview PDF
                      </button>
                      <Link to={`/analysis/${a._id}`} className="text-xs text-slate-600 hover:text-indigo-600 font-medium inline-flex items-center">
                        View Analysis →
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnalysisCard(a._id, a.fileName || a.targetRole)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
                        title="Delete this analysis and its records from database"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        Delete
                      </button>
                    </div>
                    <div className="shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full sm:w-auto shadow-xs whitespace-nowrap"
                        onClick={() => handleGenerateResume(a._id)}
                        isLoading={generating}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Generate ATS Resume
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          allResumes.length === 0 && (
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
          )
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

  const targetAnalysisId =
    currentAnalysis?._id ||
    (typeof resume?.analysisId === 'object' ? resume.analysisId?._id : resume?.analysisId) ||
    '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Breadcrumbs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/dashboard"
            className="text-slate-500 hover:text-indigo-600 font-medium transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => setShowAllResumes(true)}
            className="text-slate-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            title="Click to view all resumes"
          >
            ATS Resumes
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-[280px]">
            {resume.companyName && resume.companyName !== 'General Application' && resume.companyName !== 'Target Role'
              ? resume.companyName
              : (currentAnalysis?.fileName || 'Master Resume')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllResumes(true)}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs font-semibold"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            <span>Switch / View All ({allResumes.length})</span>
          </Button>

          {targetAnalysisId && (
            <Link
              to={`/analysis/${targetAnalysisId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Analysis Report</span>
            </Link>
          )}

          {/* Tailor for Specific Job Opening Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTailorForm((prev) => ({
                ...prev,
                baseAnalysisId: targetAnalysisId || availableAnalyses[0]?._id || ''
              }));
              setShowTailorModal(true);
            }}
            className="shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            <span>+ Tailor for Opening</span>
          </Button>
        </div>
      </div>

      {/* Multiple Resumes Switcher Shelf */}
      {allResumes.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              Your Tailored Resumes & Openings ({allResumes.length})
            </span>
            <span className="text-[11px] text-slate-400">Click any card to switch versions • Click trash to delete completely</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {allResumes.map((r) => {
              const isActive = r._id === resume._id;
              const displayName =
                r.companyName && r.companyName !== 'General Application' && r.companyName !== 'Target Role'
                  ? r.companyName
                  : (r.analysisId?.fileName || currentAnalysis?.fileName || 'Uploaded Resume');

              const displayRole =
                r.targetRole && r.targetRole !== 'Target Role'
                  ? r.targetRole
                  : (r.analysisId?.targetRole || currentAnalysis?.targetRole || 'Software Developer');

              return (
                <div
                  key={r._id}
                  onClick={() => navigate(`/resume/${r._id}`)}
                  className={`group relative px-3 py-2 rounded-lg text-left text-xs shrink-0 border cursor-pointer transition-all pr-8 ${
                    isActive
                      ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-200'
                      : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 truncate max-w-[170px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{displayName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                    {displayRole} • {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>

                  {/* Quick Delete Card Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteResumeCard(e, r._id)}
                    title="Delete this resume version"
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors opacity-70 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
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
            {resume.companyName && resume.companyName !== 'General Application' && resume.companyName !== 'Target Role'
              ? `${resume.companyName} Resume`
              : (currentAnalysis?.fileName || 'ATS-Optimized Resume')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Target Role: <strong className="text-slate-700">{resume.targetRole && resume.targetRole !== 'Target Role' ? resume.targetRole : (currentAnalysis?.targetRole || 'Software Developer')}</strong></span>
            <span>•</span>
            <span>Document: <strong className="text-slate-700">{currentAnalysis?.fileName || 'Uploaded_Resume.pdf'}</strong></span>
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteResumeCard(null, resume._id)}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
            title="Permanently remove this resume and its analysis from the app"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
            Delete
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

        {/* View Switcher: Full ATS | Native PDF Stream | Side-by-Side (Compare) | Original Uploaded PDF */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">View:</span>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 flex-wrap">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              ATS Preview (A4)
            </button>

            <button
              type="button"
              onClick={() => setViewMode('native')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'native' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View in native browser PDF reader stream"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Native PDF Stream
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
                viewMode === 'original' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
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
                viewMode === 'code' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
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
              {targetAnalysisId && currentAnalysis?.hasOriginalPdf ? (
                <iframe
                  src={resumeService.getOriginalPdfUrl(targetAnalysisId)}
                  className="w-full h-full border-none"
                  title="Original Uploaded PDF"
                />
              ) : (
                <div className="p-6 text-xs text-slate-600 overflow-y-auto space-y-3 font-mono">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs">
                    <strong>Original Extracted Content</strong> (Re-upload in Analyze to activate in-app PDF viewing)
                  </div>
                  {(currentAnalysis?.resumeText || (typeof resume?.analysisId === 'object' ? resume.analysisId?.resumeText : '')) ? (
                    <div className="whitespace-pre-wrap leading-relaxed bg-white p-4 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 max-h-[750px] overflow-y-auto">
                      {currentAnalysis?.resumeText || resume.analysisId?.resumeText}
                    </div>
                  ) : (
                    <div className="p-6 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-400 italic">
                      Original text is loading...
                    </div>
                  )}
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
            {targetAnalysisId && currentAnalysis?.hasOriginalPdf && (
              <a
                href={resumeService.getOriginalPdfUrl(targetAnalysisId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                <span>Open in new tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {targetAnalysisId && currentAnalysis?.hasOriginalPdf ? (
            <div className="h-[850px] w-full">
              <iframe
                src={resumeService.getOriginalPdfUrl(targetAnalysisId)}
                className="w-full h-full border-none"
                title="Original Uploaded PDF"
              />
            </div>
          ) : (
            <div className="p-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Original Document Content</h3>
              <p className="text-xs text-slate-500">
                This resume was uploaded in an earlier session before PDF archiving was active. Below is the full extracted text evaluated by AI. Re-upload in <strong>Analyze</strong> to enable full in-app PDF viewing.
              </p>
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-left text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-800">
                {currentAnalysis?.resumeText || (typeof resume?.analysisId === 'object' ? resume.analysisId?.resumeText : '') || 'Extracted resume text is loading...'}
              </div>
            </div>
          )}
        </Card>
      ) : viewMode === 'code' ? (
        /* Raw HTML Code View */
        <Card className="shadow-lg p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="p-4 text-slate-100 overflow-x-auto font-mono text-xs max-h-[800px]">
            <pre>{editableHtml || resume.html}</pre>
          </div>
        </Card>
      ) : viewMode === 'native' ? (
        /* Native Browser PDF Stream View (Puppeteer Binary Engine) */
        <Card className="shadow-2xl p-0 overflow-hidden bg-[#525659] border-slate-700">
          <div className="bg-slate-900 px-4 py-2 text-xs text-slate-300 flex items-center justify-between border-b border-slate-800">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <strong>Native Browser PDF Engine</strong> (Exact high-resolution binary preview)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium inline-flex items-center gap-1 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium inline-flex items-center gap-1 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>
          <div className="h-[950px] w-full bg-[#525659]">
            <iframe
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/resume/${resume._id}/pdf?inline=true`}
              className="w-full h-full border-none shadow-2xl"
              title="CareerPilot Native PDF Reader"
            />
          </div>
        </Card>
      ) : (
        /* Standard Full A4 ATS Preview (Acrobat/Docs Style PDF Reader) */
        <Card className="shadow-2xl p-0 overflow-hidden bg-[#525659] border-slate-700">
          {/* PDF Viewer Dark Control Bar */}
          <div className="bg-slate-900 text-slate-200 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-white uppercase tracking-wider bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700 text-[10px]">
                PDF Document
              </span>
              <span className="text-slate-400">Page 1 of 1 • 210 × 297 mm (A4 Single-Column)</span>
            </div>

            {/* Zoom & PDF Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 px-1 py-0.5 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(prev - 15, 60))}
                  title="Zoom Out"
                  className="p-1 hover:text-white rounded hover:bg-slate-700"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  title="Reset to 100%"
                  className="px-2 font-mono text-[11px] hover:text-white"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(prev + 15, 175))}
                  title="Zoom In"
                  className="p-1 hover:text-white rounded hover:bg-slate-700"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                title="Print Document"
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium inline-flex items-center gap-1 border border-slate-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                title="Download PDF"
                className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center gap-1 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-10 bg-[#525659] flex justify-center overflow-auto min-h-[900px] scrollbar-thin">
            {/* Standard A4 Paper Sheet with realistic drop shadow */}
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
              className="w-full max-w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-2xl rounded-[1px] p-8 sm:p-14 border border-slate-300 relative my-2 print:m-0 print:p-0 print:shadow-none print:border-none"
            >
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

      {/* PDF Viewer Popup Modal */}
      {pdfModalData && (
        <PdfViewerModal
          isOpen={Boolean(pdfModalData)}
          onClose={() => setPdfModalData(null)}
          title={pdfModalData.title}
          targetRole={pdfModalData.targetRole}
          score={pdfModalData.score}
          analysisId={pdfModalData.analysisId}
          resumeId={pdfModalData.resumeId}
          htmlContent={pdfModalData.htmlContent}
          hasOriginalPdf={pdfModalData.hasOriginalPdf}
          rawResumeText={pdfModalData.rawResumeText}
        />
      )}
    </div>
  );
};

export default ResumeGeneratorPage;
