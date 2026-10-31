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
  Maximize2,
  Upload,
  FileUp,
  Folder
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

  // Original Resumes document vault states on /resume
  const [showUploadBox, setShowUploadBox] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTargetRole, setUploadTargetRole] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

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
    requiredSkills: '',
    jobDescription: '',
    baseAnalysisId: ''
  });
  const [tailoring, setTailoring] = useState(false);

  // Computed targetAnalysisId right here at top level to completely prevent TDZ errors
  const targetAnalysisId =
    currentAnalysis?._id ||
    (typeof resume?.analysisId === 'object' ? resume.analysisId?._id : resume?.analysisId) ||
    '';

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
          // Navigated to /resume directly (no specific resume ID):
          // Show the Original Uploaded Resumes manager by default!
          setResume(null);
          const [aRes, rRes] = await Promise.all([
            analysisService.getAnalyses(),
            resumeService.getResumes()
          ]);
          if (aRes.success) setAvailableAnalyses(aRes.data?.analyses || []);
          if (rRes.success) setAllResumes(rRes.data?.resumes || []);
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
    if (!window.confirm('Permanently remove this tailored ATS resume? Your original uploaded resumes and roadmaps will NOT be deleted.')) return;
    try {
      const res = await resumeService.deleteResume(resumeId);
      if (res.success) {
        toast.success('Tailored ATS resume deleted.');
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Only PDF or DOC/DOCX files are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB.');
      return;
    }

    setUploadFile(file);
    if (!uploadTargetRole) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/resume/gi, '')
        .replace(/cv/gi, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      if (cleanName && cleanName.length > 2) {
        setUploadTargetRole(cleanName);
      }
    }
  };

  const handleUploadResumeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a resume file (PDF or DOCX).');
      return;
    }
    if (!uploadTargetRole.trim()) {
      toast.error('Please enter a target role.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('resume', uploadFile);
      formData.append('targetRole', uploadTargetRole.trim());

      const res = await analysisService.createAnalysis(formData);
      if (res.success) {
        toast.success('Resume uploaded successfully!');
        setUploadFile(null);
        setUploadTargetRole('');
        setShowUploadBox(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await loadLists();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload resume document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadOriginalFile = async (e, id, fileName) => {
    if (e) e.stopPropagation();
    try {
      toast.loading('Preparing download...', { id: 'dl-toast' });
      await analysisService.downloadOriginalResumeFile(id, fileName);
      toast.success('Download started', { id: 'dl-toast' });
    } catch (err) {
      toast.error('Failed to download resume file', { id: 'dl-toast' });
    }
  };

  const handleViewOriginalResume = (e, a) => {
    if (e) e.stopPropagation();
    setPdfModalData({
      title: a.fileName || 'Uploaded Resume',
      targetRole: a.targetRole || 'Software Professional',
      analysisId: a._id,
      hasOriginalPdf: true,
      rawResumeText: a.resumeText || ''
    });
  };

  const handleDeleteUploadedResume = async (e, id, fileName) => {
    if (e) e.stopPropagation();
    if (
      !window.confirm(
        `Permanently delete "${fileName || 'this resume'}"?\n\nNote: Your roadmaps will remain intact and will NOT be deleted.`
      )
    ) {
      return;
    }
    try {
      const res = await analysisService.deleteAnalysis(id);
      if (res.success) {
        toast.success(`"${fileName || 'Resume'}" deleted successfully.`);
        await loadLists();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete resume document.');
    }
  };

  const handleOpenTailorModal = (preferredBaseId = null) => {
    const defaultId = preferredBaseId || targetAnalysisId || availableAnalyses[0]?._id || '';
    const defaultAnalysis = availableAnalyses.find((a) => a._id === defaultId);
    setTailorForm({
      baseAnalysisId: defaultId,
      targetRole: defaultAnalysis?.targetRole || '',
      companyName: '',
      requiredSkills: defaultAnalysis?.matchedSkills?.slice(0, 8).join(', ') || '',
      jobDescription: defaultAnalysis?.jobDescription || ''
    });
    setShowTailorModal(true);
  };

  // Tailor for specific job opening submit
  const handleTailorSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!tailorForm.baseAnalysisId) {
      toast.error('Please select which original resume you want to tailor.');
      return;
    }
    if (!tailorForm.targetRole.trim()) {
      toast.error('Please enter the target role you want to tailor for.');
      return;
    }

    const companyToUse = tailorForm.companyName?.trim() || 'Custom Application';

    try {
      setTailoring(true);
      const res = await resumeService.tailorResume({
        baseAnalysisId: tailorForm.baseAnalysisId,
        companyName: companyToUse,
        targetRole: tailorForm.targetRole.trim(),
        requiredSkills: tailorForm.requiredSkills?.trim() || '',
        jobDescription: tailorForm.jobDescription?.trim() || ''
      });

      if (res.success && res.data?.resume) {
        toast.success(`Tailored ATS resume created for ${companyToUse} (${tailorForm.targetRole})!`);
        setShowTailorModal(false);
        setTailorForm({
          companyName: '',
          targetRole: '',
          requiredSkills: '',
          jobDescription: '',
          baseAnalysisId: ''
        });
        setResume(res.data.resume);
        setEditableHtml(res.data.resume.html);
        setShowAllResumes(false);
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
        {/* Return Button if a resume is currently selected */}
        {resume && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setShowAllResumes(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Return to Active Resume Editor ({resume.companyName || currentAnalysis?.fileName || 'Resume'})</span>
            </button>
            <span className="text-xs text-slate-500 font-medium">Select any resume below to open it</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ATS Resumes & Documents
              </h1>
              <p className="text-xs text-slate-500">
                Manage your uploaded source resumes, tailor ATS resumes for specific job openings, and customize templates.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadBox((prev) => !prev)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 text-xs font-semibold"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span>+ Upload Resume</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenTailorModal()}
              className="shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              + Tailor for Opening
            </Button>
          </div>
        </div>

        {/* SECTION 1: Original Uploaded Resumes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Original Uploaded Resumes ({availableAnalyses.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Your source resume documents. View, download, delete, or tailor for a new role.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadBox((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showUploadBox ? 'Close Upload' : 'Upload Resume'}</span>
            </button>
          </div>

          {/* Expandable Upload Box */}
          {showUploadBox && (
            <div className="bg-slate-50/80 border border-indigo-200 rounded-2xl p-5 shadow-xs space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  Upload New Resume Document
                </span>
                <button
                  type="button"
                  onClick={() => setShowUploadBox(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadResumeSubmit} className="space-y-3.5">
                {/* File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    uploadFile
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{uploadFile.name}</p>
                        <p className="text-[11px] text-slate-500">{formatFileSize(uploadFile.size)} • Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-7 h-7 text-indigo-500 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-semibold text-slate-700">
                        Click or drag resume file here (PDF or DOCX, max 10MB)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Clean document upload stored securely to your account
                      </p>
                    </div>
                  )}
                </div>

                {/* Target Role input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Target Job Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTargetRole}
                    onChange={(e) => setUploadTargetRole(e.target.value)}
                    placeholder="e.g. Senior Python Developer, Full Stack Engineer, Data Scientist"
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadBox(false);
                      setUploadFile(null);
                      setUploadTargetRole('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isUploading}
                    disabled={!uploadFile || !uploadTargetRole.trim() || isUploading}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload & Save Resume
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Original Resumes Grid */}
          {availableAnalyses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Original Resumes Uploaded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your resume document (PDF or DOCX) to keep it in your documents vault and tailor custom ATS versions.
              </p>
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowUploadBox(true)}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  + Upload Your First Resume
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableAnalyses.map((a) => (
                <div
                  key={a._id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  {/* Document Header info */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-sm font-bold text-slate-900 truncate"
                        title={a.fileName || 'Uploaded Resume'}
                      >
                        {a.fileName || 'Uploaded Resume'}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        <span className="font-semibold text-slate-700">{a.targetRole || 'Professional'}</span>
                        <span className="mx-1.5">•</span>
                        <span>{formatFileSize(a.fileSize)}</span>
                        <span className="mx-1.5">•</span>
                        <span>{new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </p>
                    </div>
                  </div>

                  {/* Document Actions bar - Nothing extra! Clean View, Download, Delete, Tailor */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleViewOriginalResume(e, a)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="View resume in PDF reader"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownloadOriginalFile(e, a._id, a.fileName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Download original file"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Download</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteUploadedResume(e, a._id, a.fileName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-lg transition-colors cursor-pointer"
                        title="Delete this resume document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenTailorModal(a._id)}
                      className="text-xs"
                      title="Generate or tailor an ATS-optimized resume from this document"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      <span>+ Tailor ATS</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Your Tailored & Master ATS Resumes */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Your Tailored & Master ATS Resumes ({allResumes.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  ATS-optimized resume versions customized for specific job openings and companies.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenTailorModal()}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              + Tailor for Opening
            </Button>
          </div>

          {allResumes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Tailored ATS Resumes Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tailor an ATS-compliant resume customized for a specific target company and role.
              </p>
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenTailorModal()}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  + Tailor Your First Resume
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allResumes.map((r) => {
                const isActive = r._id === resume?._id;
                const displayName =
                  r.companyName && r.companyName !== 'General Application' && r.companyName !== 'Target Role'
                    ? r.companyName
                    : (r.analysisId?.fileName || 'ATS Master Resume');
                const displayRole =
                  r.targetRole && r.targetRole !== 'Target Role'
                    ? r.targetRole
                    : (r.analysisId?.targetRole || 'Software Developer');

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
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete this tailored resume (keeps original uploaded resume intact)"
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
                        <span>{isActive ? 'Resume Active →' : 'Open Resume Editor →'}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Tailor for New Job Opening Modal (In List View) */}
        {showTailorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tailor Resume for a Job Opening</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select which uploaded resume to use and which target role to tailor for.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTailorModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTailorSubmit} className="space-y-4">
                {/* STEP 1: Select which base resume to tailor */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    1. Which Original Resume Do You Want to Tailor? *
                  </label>
                  {availableAnalyses.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center justify-between">
                      <span>No original resumes found in your account.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTailorModal(false);
                          setShowUploadBox(true);
                        }}
                        className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer"
                      >
                        + Upload Resume
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {availableAnalyses.map((a) => {
                        const isSelected = tailorForm.baseAnalysisId === a._id;
                        return (
                          <div
                            key={a._id}
                            onClick={() => {
                              setTailorForm((prev) => ({
                                ...prev,
                                baseAnalysisId: a._id,
                                targetRole: a.targetRole || prev.targetRole || '',
                                requiredSkills: prev.requiredSkills || a.matchedSkills?.slice(0, 8).join(', ') || '',
                                jobDescription: prev.jobDescription || a.jobDescription || ''
                              }));
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {a.fileName || 'Uploaded Resume'}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                Original Role: <span className="font-semibold text-slate-700">{a.targetRole || 'General'}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* STEP 2: Target Role */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    2. Which Role Are You Tailoring For? *
                  </label>
                  <input
                    type="text"
                    required
                    value={tailorForm.targetRole}
                    onChange={(e) => setTailorForm({ ...tailorForm, targetRole: e.target.value })}
                    placeholder="e.g. Senior QA Engineer, Full Stack Developer, Python Developer"
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Specify the exact job title to optimize ATS formatting and keyword alignment.
                  </p>
                </div>

                {/* STEP 3: Company / Application Name (Optional) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    3. Target Company or Opening Name <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={tailorForm.companyName}
                    onChange={(e) => setTailorForm({ ...tailorForm, companyName: e.target.value })}
                    placeholder="e.g. Zepto, Google, Paytm (leave blank for general)"
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>

                {/* STEP 4: Key Required Skills & Keywords (Optional) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    4. Key Required Skills & Keywords <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={tailorForm.requiredSkills}
                    onChange={(e) => setTailorForm({ ...tailorForm, requiredSkills: e.target.value })}
                    placeholder="e.g. Python, FastAPI, Docker, PostgreSQL, AWS, Redis, Kubernetes"
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Specify comma-separated must-have skills from the job posting to ensure optimal ATS keyword tailoring.
                  </p>
                </div>

                {/* STEP 5: Target Job Description */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    5. Paste Job Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={tailorForm.jobDescription}
                    onChange={(e) => setTailorForm({ ...tailorForm, jobDescription: e.target.value })}
                    placeholder="Paste the LinkedIn or company job requirements. Gemini AI will tailor your summary and work experience bullet points to match..."
                    className="w-full text-xs px-3.5 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTailorModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={tailoring}
                    disabled={availableAnalyses.length === 0 || !tailorForm.baseAnalysisId || !tailorForm.targetRole.trim() || tailoring}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Create Tailored Resume
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PDF Viewer Popup Modal (In List View) */}
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
  }

  // Template specific class styles
  const templateClassMap = {
    modern: 'modern-template font-sans',
    classic: 'classic-template font-serif',
    compact: 'compact-template font-sans leading-snug'
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Breadcrumbs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/resume"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>← Back to ATS Resumes</span>
          </Link>
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
            onClick={() => navigate('/resume')}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs font-semibold"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            <span>All ATS Resumes ({allResumes.length})</span>
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
            onClick={() => handleOpenTailorModal(targetAnalysisId)}
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
                  className={`group relative px-3 py-2 rounded-lg text-left text-xs shrink-0 border cursor-pointer transition-all pr-8 ${isActive
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${selectedTemplate === tmpl.id
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
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Eye className="w-3.5 h-3.5" />
              ATS Preview (A4)
            </button>

            <button
              type="button"
              onClick={() => setViewMode('native')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'native' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              title="View in native browser PDF reader stream"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Native PDF Stream
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'split' ? 'bg-white text-slate-900 shadow-sm font-bold text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              title="Compare Original Uploaded Resume vs ATS Version"
            >
              <Columns className="w-3.5 h-3.5" />
              Side-by-Side (Compare)
            </button>

            <button
              type="button"
              onClick={() => setViewMode('original')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'original' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              title="View original uploaded PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              Original Uploaded PDF
            </button>

            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'code' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
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
                    className={`resume-html-preview prose prose-slate max-w-none text-slate-900 ${templateClassMap[selectedTemplate]} ${isEditing ? 'ring-2 ring-indigo-400 ring-offset-2 cursor-text' : ''
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
                className={`resume-html-preview prose prose-slate max-w-none text-slate-900 ${templateClassMap[selectedTemplate]} ${isEditing ? 'ring-2 ring-indigo-400 ring-offset-2 cursor-text' : ''
                  }`}
                dangerouslySetInnerHTML={{ __html: editableHtml }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tailor for New Job Opening Modal */}
      {showTailorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tailor Resume for a Job Opening</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which uploaded resume to use and which target role to tailor for.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTailorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTailorSubmit} className="space-y-4">
              {/* STEP 1: Select which base resume to tailor */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  1. Which Original Resume Do You Want to Tailor? *
                </label>
                {availableAnalyses.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                    No original resumes found in your account.{' '}
                    <Link to="/profile" className="font-bold underline text-amber-900">
                      Upload a resume in Profile
                    </Link>{' '}
                    first before tailoring.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableAnalyses.map((a) => {
                      const isSelected = tailorForm.baseAnalysisId === a._id;
                      return (
                        <div
                          key={a._id}
                          onClick={() => {
                            setTailorForm((prev) => ({
                              ...prev,
                              baseAnalysisId: a._id,
                              targetRole: a.targetRole || prev.targetRole || '',
                              requiredSkills: prev.requiredSkills || a.matchedSkills?.slice(0, 8).join(', ') || '',
                              jobDescription: prev.jobDescription || a.jobDescription || ''
                            }));
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {a.fileName || 'Uploaded Resume'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              Original Role: <span className="font-semibold text-slate-700">{a.targetRole || 'General'}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 2: Ask for Target Role Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  2. Which Role Are You Tailoring For? *
                </label>
                <input
                  type="text"
                  required
                  value={tailorForm.targetRole}
                  onChange={(e) => setTailorForm({ ...tailorForm, targetRole: e.target.value })}
                  placeholder="e.g. Senior QA Engineer, Full Stack Developer, Python Developer"
                  className="w-full text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Specify the exact job title to optimize ATS formatting and keyword alignment.
                </p>
              </div>

              {/* STEP 3: Company / Application Name (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  3. Target Company or Opening Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={tailorForm.companyName}
                  onChange={(e) => setTailorForm({ ...tailorForm, companyName: e.target.value })}
                  placeholder="e.g. Zepto, Google, Paytm (leave blank for general)"
                  className="w-full text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
              </div>

              {/* STEP 4: Key Required Skills & Keywords (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  4. Key Required Skills & Keywords <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={tailorForm.requiredSkills}
                  onChange={(e) => setTailorForm({ ...tailorForm, requiredSkills: e.target.value })}
                  placeholder="e.g. Python, FastAPI, Docker, PostgreSQL, AWS, Redis, Kubernetes"
                  className="w-full text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Specify comma-separated must-have skills from the job posting to ensure optimal ATS keyword tailoring.
                </p>
              </div>

              {/* STEP 5: Target Job Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  5. Paste Job Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={tailorForm.jobDescription}
                  onChange={(e) => setTailorForm({ ...tailorForm, jobDescription: e.target.value })}
                  placeholder="Paste the LinkedIn or company job requirements. Gemini AI will tailor your summary and work experience bullet points to match..."
                  className="w-full text-xs px-3.5 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTailorModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={tailoring}
                  disabled={availableAnalyses.length === 0 || !tailorForm.baseAnalysisId || !tailorForm.targetRole.trim() || tailoring}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Create Tailored Resume
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
