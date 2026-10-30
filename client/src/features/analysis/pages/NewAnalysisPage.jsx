import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Sparkles, Briefcase, FileText, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
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
  'Evaluating technical skills against target role...',
  'Pinpointing high-importance missing skills and gaps...',
  'Finalizing ATS scoring and recommendations...'
];

export const NewAnalysisPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      targetRole: '',
      jobDescription: ''
    }
  });

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

  const onSubmit = async (data) => {
    if (!file) {
      setFileError('Please select or drop your resume (PDF or DOCX).');
      return;
    }
    setFileError('');

    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('targetRole', data.targetRole);
      if (data.jobDescription) {
        formData.append('jobDescription', data.jobDescription);
      }

      const res = await analysisService.createAnalysis(formData);
      if (res.success && res.data?.analysis) {
        toast.success(
          res.data.isCached
            ? 'Loaded instant analysis from cache!'
            : 'AI analysis generated successfully!'
        );
        navigate(`/analysis/${res.data.analysis._id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to analyze resume. Please try again.');
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Step 1 of 4 • Skill-Gap Analysis</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Analyze Your Resume Against Target Role
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload your resume and specify your desired job. Gemini AI will evaluate your ATS match score, extract your skills, and identify high-priority gaps.
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
                AI is Analyzing Your Resume
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
          {/* Resume Upload Section */}
          <Card title="1. Upload Resume" subtitle="Upload your current resume in PDF or DOCX format (Max 5MB)">
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

          {/* Target Role & JD Section */}
          <Card title="2. Target Position" subtitle="Specify the role you are targeting so the AI can compute honest skill gaps">
            <div className="space-y-5">
              <Input
                label="Target Job Title / Role *"
                placeholder="e.g. Senior Full-Stack Engineer, MERN Developer, Frontend Lead"
                icon={Briefcase}
                error={errors.targetRole?.message}
                {...register('targetRole', {
                  required: 'Target role is required to evaluate skill gaps',
                  minLength: {
                    value: 2,
                    message: 'Role title must be at least 2 characters'
                  }
                })}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Target Job Description (Optional but recommended)
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste specific requirements, responsibilities, or bullet points from the job posting..."
                  className="block w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  {...register('jobDescription')}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Providing a real JD enables high-precision ATS matching and tailored missing-skill detection.
                </p>
              </div>
            </div>
          </Card>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="min-w-[200px]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start AI Gap Analysis
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default NewAnalysisPage;

