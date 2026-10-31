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
  Code2
} from 'lucide-react';
import toast from 'react-hot-toast';
import analysisService from '../../../services/analysisService.js';
import profileService from '../../../services/profileService.js';
import ResumeDropzone from '../components/ResumeDropzone.jsx';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Input from '../../../components/common/Input.jsx';

const STAGED_MESSAGES = [
  'Extracting text from your resume file...',
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
    if (!file) {
      setFileError('Please select or drop your resume (PDF or DOCX).');
      return;
    }
    setFileError('');
    setDuplicateConflict(null);

    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('resume', file);
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
          Enter target company and job details, upload your resume, and let AI evaluate skill gaps and generate your personalized 12-week learning roadmap.
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

          {/* STEP 2: Upload Resume */}
          <Card
            title="2. Upload Resume"
            subtitle="Upload your current resume in PDF or DOCX format (Max 5MB)"
          >
            <ResumeDropzone
              file={file}
              onFileSelect={(selectedFile) => {
                setFile(selectedFile);
                setFileError('');
              }}
              onFileRemove={() => setFile(null)}
              error={fileError}
            />
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
    </div>
  );
};

export default NewAnalysisPage;
