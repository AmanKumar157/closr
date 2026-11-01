import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Sparkles,
  Briefcase,
  Building,
  FileText,
  Map,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Code2,
  FolderOpen,
  UploadCloud,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import analysisService from '../../../services/analysisService.js';
import profileService from '../../../services/profileService.js';
import ResumeDropzone from '../components/ResumeDropzone.jsx';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Input from '../../../components/common/Input.jsx';
import PdfViewerModal from '../../../components/common/PdfViewerModal.jsx';

const STAGED_MESSAGES = [
  'Extracting text from resume...',
  'Connecting to Gemini AI recruiter engine...',
  'Evaluating technical skills against company & role requirements...',
  'Pinpointing high-importance missing skills and gaps...',
  'Finalizing ATS scoring and constructing 12-week roadmap...'
];

export const NewAnalysisPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [duplicateConflict, setDuplicateConflict] = useState(null);

  // Resume source state: 'saved' (pre-uploaded) or 'upload' (new file)
  const [resumeSource, setResumeSource] = useState('saved');
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [pdfModalData, setPdfModalData] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      companyName: '',
      targetRole: '',
      requiredSkills: '',
      jobDescription: '',
      autoGenerateRoadmap: true,
      overwrite: false
    }
  });

  const autoGenerateRoadmap = watch('autoGenerateRoadmap');

  // Load pre-uploaded resumes from user account
  useEffect(() => {
    const fetchSavedResumes = async () => {
      try {
        setLoadingSaved(true);
        const res = await analysisService.getAnalyses({ unique: 'true' });
        if (res.success && res.data?.analyses) {
          const analyses = res.data.analyses;
          // Deduplicate by resumeTextHash or normalized fileName + fileSize to present unique original resume documents
          const uniqueResumes = [];
          const seenKeys = new Set();
          const cleanName = (name) => (name || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');

          for (const a of analyses) {
            const key = a.resumeTextHash || `${cleanName(a.fileName)}_${a.fileSize || 0}`;
            if (key && !seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueResumes.push(a);
            }
          }

          setSavedResumes(uniqueResumes);
          if (uniqueResumes.length > 0) {
            setSelectedResumeId(uniqueResumes[0]._id);
            setResumeSource('saved');
          } else {
            setResumeSource('upload');
          }
        }
      } catch (err) {
        // Soft fail to upload mode
        setResumeSource('upload');
      } finally {
        setLoadingSaved(false);
      }
    };

    fetchSavedResumes();
  }, []);

  // Prefill target role and JD from user profile if available
  useEffect(() => {
    const loadProfileDefaults = async () => {
      try {
        const res = await profileService.getProfile();
        if (res.success && res.data?.profile) {
          const profile = res.data.profile;
          if (profile.targetRole) setValue('targetRole', profile.targetRole);
          if (profile.jobDescription) setValue('jobDescription', profile.jobDescription);
        }
      } catch (err) {
        // Soft fail - manual entry still works
      }
    };

    loadProfileDefaults();
  }, [setValue]);

  // Rotate staged loading messages while waiting for Gemini
  useEffect(() => {
    let interval;
    if (analyzing) {
      interval = setInterval(() => {
        setStageIndex((prev) => (prev + 1 < STAGED_MESSAGES.length ? prev + 1 : prev));
      }, 2500);
    } else {
      setStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const runAnalysis = async (data, forceOverwrite = false) => {
    // Validate resume selection based on active tab
    if (resumeSource === 'saved') {
      if (!selectedResumeId) {
        setFileError('Please select a pre-uploaded resume or switch to upload a new one.');
        return;
      }
    } else {
      if (!file) {
        setFileError('Please select or drop your resume (PDF or DOCX).');
        return;
      }
    }

    setFileError('');
    setDuplicateConflict(null);

    try {
      setAnalyzing(true);
      const formData = new FormData();

      if (resumeSource === 'saved') {
        formData.append('existingAnalysisId', selectedResumeId);
      } else {
        formData.append('resume', file);
      }

      formData.append('targetRole', data.targetRole.trim());
      if (data.companyName?.trim()) {
        formData.append('companyName', data.companyName.trim());
      }
      if (data.requiredSkills?.trim()) {
        formData.append('requiredSkills', data.requiredSkills.trim());
      }
      if (data.jobDescription?.trim()) {
        formData.append('jobDescription', data.jobDescription.trim());
      }
      formData.append('autoGenerateRoadmap', data.autoGenerateRoadmap ? 'true' : 'false');

      if (forceOverwrite || data.overwrite) {
        formData.append('overwrite', 'true');
      }

      const res = await analysisService.createAnalysis(formData);
      if (res.success && res.data?.analysis) {
        if (res.data.roadmap?._id) {
          toast.success('Skill gap analyzed and 12-week roadmap generated successfully!');
          navigate(`/roadmap/${res.data.roadmap._id}`);
        } else {
          toast.success(
            res.data.isCached
              ? 'Loaded instant analysis from cache!'
              : 'AI analysis generated successfully!'
          );
          navigate(`/analysis/${res.data.analysis._id}`);
        }
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('duplicate resume detected')) {
        setDuplicateConflict({
          message: err.message,
          data
        });
      }
      toast.error(err.message || 'Failed to analyze resume. Please try again.');
      setAnalyzing(false);
    }
  };

  const onSubmit = (data) => runAnalysis(data, false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
          <Sparkles className="w-4 h-4" />
          <span>AI Recruiter Engine • Skill-Gap Analysis & Roadmap</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Target Role Gap Analysis & Roadmap
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter target company and job details, choose a saved resume or upload a new one, and let AI evaluate skill gaps and generate your personalized 12-week roadmap.
        </p>
      </div>

      {analyzing ? (
        /* Staged AI Loading Overlay */
        <Card className="py-16 text-center border-indigo-200 bg-indigo-50/20 shadow-md">
          <div className="max-w-md mx-auto space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Analyzing Gaps & Building Roadmap
              </h3>
              <p className="text-sm text-indigo-600 font-medium mt-2 min-h-[24px] transition-all">
                {STAGED_MESSAGES[stageIndex]}
              </p>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center items-center gap-2 pt-2">
              {STAGED_MESSAGES.map((msg, idx) => (
                <div
                  key={msg}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    idx === stageIndex
                      ? 'w-8 bg-indigo-600'
                      : idx < stageIndex
                      ? 'w-2 bg-emerald-500'
                      : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-slate-400">
              This usually takes 5-10 seconds depending on resume length.
            </p>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1: Target Company & Job Details */}
          <Card
            title="1. Target Company & Job Details"
            subtitle="Specify the employer, role, required skills, and job description to evaluate real-world skill gaps"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Company */}
                <Input
                  label="Target Company (Optional)"
                  placeholder="e.g. Google, Microsoft, Zepto, Paytm"
                  icon={Building}
                  {...register('companyName')}
                />

                {/* Target Job Title / Role */}
                <Input
                  label="Role Name / Target Job Title *"
                  placeholder="e.g. Senior Full-Stack Engineer, MERN Developer"
                  icon={Briefcase}
                  error={errors.targetRole?.message}
                  {...register('targetRole', {
                    required: 'Target role name is required to evaluate skill gaps',
                    minLength: {
                      value: 2,
                      message: 'Role title must be at least 2 characters'
                    }
                  })}
                />
              </div>

              {/* Required Skills */}
              <Input
                label="Required Skills (Optional)"
                placeholder="e.g. Python, SQL, REST APIs, Docker, CI/CD, React, TypeScript"
                icon={Code2}
                helperText="Enter comma-separated core skills required by the job posting."
                {...register('requiredSkills')}
              />

              {/* Complete Description of Job */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Complete Description of Job (Optional but recommended)
                </label>
                <textarea
                  rows={5}
                  placeholder="Paste the complete job description, requirements, responsibilities, or bullet points from the job posting..."
                  className="block w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  {...register('jobDescription')}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Providing full JD details enables pinpoint ATS scoring and precision missing-skill identification.
                </p>
              </div>
            </div>
          </Card>

          {/* STEP 2: Choose Pre-Uploaded Resume OR Upload New */}
          <Card
            title="2. Select Resume"
            subtitle="Choose a previously uploaded resume from your account or upload a new PDF/DOCX file"
          >
            {/* Source Toggle Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setResumeSource('saved');
                  setFileError('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  resumeSource === 'saved'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                <span>Choose Pre-Uploaded Resume</span>
                {savedResumes.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {savedResumes.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResumeSource('upload');
                  setFileError('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  resumeSource === 'upload'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-indigo-500" />
                <span>Upload New Resume</span>
              </button>
            </div>

            {/* View: Choose Pre-Uploaded Resume */}
            {resumeSource === 'saved' ? (
              <div className="space-y-3">
                {loadingSaved ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Loading your pre-uploaded resumes...
                  </div>
                ) : savedResumes.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No Pre-Uploaded Resumes Found</p>
                    <p className="text-xs text-slate-500">
                      You haven't uploaded any resumes yet. Upload a new resume to evaluate your skills.
                    </p>
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResumeSource('upload')}
                      >
                        <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                        Upload a Resume Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {savedResumes.map((r) => {
                      const isSelected = selectedResumeId === r._id;
                      return (
                        <div
                          key={r._id}
                          onClick={() => {
                            setSelectedResumeId(r._id);
                            setFileError('');
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Radio indicator */}
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>

                            {/* Resume icon */}
                            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {r.fileName || 'Uploaded_Resume.pdf'}
                                </h4>
                                {isSelected && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wide shrink-0">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                <span className="font-semibold text-slate-700">{r.targetRole || 'Resume Document'}</span>
                                <span>•</span>
                                <span>{new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                {r.fileSize > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{(r.fileSize / 1024).toFixed(1)} KB</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Quick Preview Button */}
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPdfModalData({
                                  title: r.fileName || 'Resume Document',
                                  targetRole: r.targetRole,
                                  score: r.matchScore,
                                  analysisId: r._id,
                                  hasOriginalPdf: r.hasOriginalPdf
                                });
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer p-1.5 rounded-lg hover:bg-indigo-50/70"
                              title="Preview PDF"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="hidden sm:inline">Preview PDF</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {fileError && resumeSource === 'saved' && (
                  <p className="text-xs text-rose-600 font-medium pt-1">{fileError}</p>
                )}
              </div>
            ) : (
              /* View: Upload New Resume */
              <div>
                <ResumeDropzone
                  file={file}
                  onFileSelect={(selectedFile) => {
                    setFile(selectedFile);
                    setFileError('');
                  }}
                  onFileRemove={() => setFile(null)}
                  error={fileError}
                />
              </div>
            )}
          </Card>

          {/* STEP 3: Options & Submission */}
          <Card className="p-4 bg-slate-50/70 border border-slate-200">
            <div className="space-y-3">
              {/* Auto-generate roadmap checkbox */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="roadmap-checkbox"
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  {...register('autoGenerateRoadmap')}
                />
                <label
                  htmlFor="roadmap-checkbox"
                  className="text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5"
                >
                  <Map className="w-4 h-4 text-indigo-600" />
                  Automatically generate 12-week learning roadmap from skill gaps
                </label>
              </div>

              {/* Overwrite Option Checkbox */}
              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200">
                <input
                  type="checkbox"
                  id="overwrite-checkbox"
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  {...register('overwrite')}
                />
                <label htmlFor="overwrite-checkbox" className="text-xs text-slate-600 font-medium cursor-pointer">
                  Overwrite / Replace previous analysis if this resume was already evaluated for this target role
                </label>
              </div>
            </div>
          </Card>

          {/* Duplicate Conflict Resolution Banner */}
          {duplicateConflict && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
              <div className="text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <span>Resume already evaluated for this role</span>
                </div>
                <p>{duplicateConflict.message}</p>
                <p className="text-[11px] text-amber-700">
                  Would you like to force an overwrite and re-analyze this resume right now?
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDuplicateConflict(null)}
                  className="border-amber-300 text-amber-900 hover:bg-amber-100/70"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => runAnalysis(duplicateConflict.data, true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Overwrite & Re-analyze
                </Button>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="min-w-[240px] shadow-md shadow-indigo-100"
            >
              {autoGenerateRoadmap ? (
                <>
                  <Map className="w-4 h-4 mr-2" />
                  Analyze Gap & Generate Roadmap
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start AI Gap Analysis
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* PDF Viewer Modal for previewing saved resume */}
      {pdfModalData && (
        <PdfViewerModal
          isOpen={!!pdfModalData}
          onClose={() => setPdfModalData(null)}
          title={pdfModalData.title}
          targetRole={pdfModalData.targetRole}
          score={pdfModalData.score}
          analysisId={pdfModalData.analysisId}
          hasOriginalPdf={pdfModalData.hasOriginalPdf}
        />
      )}
    </div>
  );
};

export default NewAnalysisPage;
