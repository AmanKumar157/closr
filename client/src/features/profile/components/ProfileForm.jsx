import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  FileText,
  Globe,
  Plus,
  Sparkles,
  Save,
  Camera,
  Trash2,
  User as UserIcon,
  Upload,
  Eye,
  UploadCloud,
  CheckCircle2,
  X,
  FileUp,
  Crop,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import profileService from '../../../services/profileService.js';
import analysisService from '../../../services/analysisService.js';
import { useAuth } from '../../../hooks/useAuth.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import SkillChip from '../../../components/common/SkillChip.jsx';
import Loader from '../../../components/common/Loader.jsx';
import PdfViewerModal from '../../../components/common/PdfViewerModal.jsx';
import ImageCropModal from '../../../components/common/ImageCropModal.jsx';

const POPULAR_SKILL_SUGGESTIONS = [
  'React',
  'Node.js',
  'Express',
  'MongoDB',
  'JavaScript',
  'TypeScript',
  'Tailwind CSS',
  'REST APIs',
  'Docker',
  'Git & GitHub',
  'AWS',
  'PostgreSQL'
];

export const ProfileForm = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [avatar, setAvatar] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageToCrop, setRawImageToCrop] = useState('');
  const [lastUploadedResume, setLastUploadedResume] = useState(null);
  const [uploadedResumes, setUploadedResumes] = useState([]);
  const [deletingResumeId, setDeletingResumeId] = useState(null);
  const [pdfModalData, setPdfModalData] = useState(null);

  // Direct resume upload state in Profile
  const [showUploader, setShowUploader] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const resumeFileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors }
  } = useForm({
    defaultValues: {
      targetRole: '',
      jobDescription: '',
      preferredLanguage: 'en'
    }
  });

  // Permanently delete a resume by ID with cascade cleanup
  const handleDeleteResume = async (analysisId, fileName) => {
    if (!analysisId) return;
    if (
      !window.confirm(
        `Permanently remove "${fileName || 'this resume'}" from your account? This will completely delete the resume file, AI analysis report, and roadmaps from the database.`
      )
    ) {
      return;
    }

    try {
      setDeletingResumeId(analysisId);
      const res = await analysisService.deleteAnalysis(analysisId);
      if (res.success) {
        toast.success(`"${fileName || 'Resume'}" deleted from database.`);
        setUploadedResumes((prev) => {
          const updated = prev.filter((r) => r._id !== analysisId);
          // If we deleted the active resume, re-point to latest remaining or null
          if (lastUploadedResume?.analysisId === analysisId) {
            if (updated.length > 0) {
              setLastUploadedResume({
                fileName: updated[0].fileName,
                fileSize: updated[0].fileSize,
                uploadedAt: updated[0].createdAt,
                analysisId: updated[0]._id
              });
            } else {
              setLastUploadedResume(null);
            }
          }
          return updated;
        });
      }
    } catch (err) {
      toast.error('Failed to delete resume.');
    } finally {
      setDeletingResumeId(null);
    }
  };

  // Direct file selection validator
  const handleSelectResumeFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resume file must be under 5MB.');
      return;
    }
    const validExtensions = ['.pdf', '.docx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error('Please upload a PDF or DOCX file.');
      return;
    }
    setUploadFile(file);
  };

  // Direct upload handler from Profile only
  const handleDirectResumeUpload = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!uploadFile) {
      toast.error('Please select a resume file (PDF or DOCX).');
      return;
    }

    const roleToUse = (getValues('targetRole') || 'Software Professional').trim();

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('resume', uploadFile);
      formData.append('targetRole', roleToUse);

      const res = await analysisService.createAnalysis(formData);
      if (res.success && res.data?.analysis) {
        const newAnalysis = res.data.analysis;
        toast.success(`Resume "${uploadFile.name}" uploaded successfully!`);

        // Prepend to uploaded resumes list
        setUploadedResumes((prev) => [newAnalysis, ...prev]);
        setLastUploadedResume({
          fileName: newAnalysis.fileName,
          fileSize: newAnalysis.fileSize,
          uploadedAt: newAnalysis.createdAt,
          analysisId: newAnalysis._id
        });

        // Auto-prefill extracted skills if any are new
        if (newAnalysis.matchedSkills?.length > 0) {
          setSkills((prevSkills) => {
            const skillSet = new Set(prevSkills.map((s) => s.toLowerCase()));
            const toAdd = newAnalysis.matchedSkills.filter((s) => !skillSet.has(s.toLowerCase()));
            if (toAdd.length > 0) {
              toast.success(`Auto-added ${toAdd.length} extracted skill(s) to your profile!`);
              return [...prevSkills, ...toAdd];
            }
            return prevSkills;
          });
        }

        // Reset upload form
        setUploadFile(null);
        setShowUploader(false);
        if (resumeFileInputRef.current) resumeFileInputRef.current.value = '';
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to upload and analyze resume.');
    } finally {
      setIsUploading(false);
    }
  };

  // Load existing profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await profileService.getProfile();
        if (res.success && res.data?.profile) {
          const profile = res.data.profile;
          reset({
            targetRole: profile.targetRole || '',
            jobDescription: profile.jobDescription || '',
            preferredLanguage: profile.preferredLanguage || 'en'
          });
          setSkills(profile.currentSkills || []);
          setAvatar(profile.avatar || user?.avatar || '');
          if (profile.lastUploadedResume?.fileName) {
            setLastUploadedResume(profile.lastUploadedResume);
          }
        }
        if (res.success && res.data?.uploadedResumes) {
          setUploadedResumes(res.data.uploadedResumes || []);
        }
      } catch (err) {
        toast.error('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [reset, user?.avatar]);

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile photo must be under 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageToCrop(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedBase64) => {
    setAvatar(croppedBase64);
    toast.success('Photo cropped! Click "Save Preferences" to apply.');
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Photo removed. Click "Save Preferences" to confirm.');
  };

  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || newSkillInput).trim();
    if (!trimmed) return;

    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Skill "${trimmed}" is already in your profile.`);
      return;
    }

    setSkills([...skills, trimmed]);
    setNewSkillInput('');
  };

  const handleKeyDownSkill = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      const payload = {
        ...data,
        currentSkills: skills,
        avatar
      };
      const res = await profileService.updateProfile(payload);
      if (res.success) {
        toast.success('Profile preferences & photo saved successfully!');
        if (setUser) {
          setUser((prev) => (prev ? { ...prev, avatar } : prev));
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader text="Loading your profile preferences..." />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Profile Photo Upload Section */}
      <div id="photo" className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-2xs scroll-mt-20">
        <div className="relative group shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt="Profile"
              className="w-22 h-22 rounded-full object-cover ring-4 ring-indigo-500/30 border-2 border-white shadow-md"
            />
          ) : (
            <div className="w-22 h-22 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl ring-4 ring-indigo-500/20 border-2 border-white shadow-inner">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-9 h-9 text-indigo-500" />}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
            title="Upload and crop new photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800">Profile Photo</h4>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              Circular Avatar
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Upload your photo (JPG, PNG, WebP up to 5MB). You'll be prompted to frame and crop it to fit your circular avatar perfectly.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload & Crop Photo
            </button>
            {avatar && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRawImageToCrop(avatar);
                    setCropModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50/50 transition-colors shadow-xs cursor-pointer"
                  title="Re-frame and crop current photo"
                >
                  <Crop className="w-3.5 h-3.5" />
                  Re-Crop Current
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Target Role & Preferred Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Target Role / Job Title"
          placeholder="e.g. Senior Full-Stack Engineer, Frontend Lead"
          icon={Briefcase}
          helperText="The dream position your resume and roadmap will be scored against."
          error={errors.targetRole?.message}
          {...register('targetRole', {
            maxLength: {
              value: 100,
              message: 'Target role cannot exceed 100 characters'
            }
          })}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-slate-500" />
            Preferred Learning Language
          </label>
          <select
            className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            {...register('preferredLanguage')}
          >
            <option value="en">English (Default)</option>
            <option value="hi">Hindi (हिंदी - For YouTube courses & tutorials)</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Roadmap resources will favor Hindi courses/tutorials where available if Hindi is selected.
          </p>
        </div>
      </div>

      {/* Current Skills Chips Manager */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Your Current Skills ({skills.length})
        </label>
        <p className="text-xs text-slate-500">
          Skills you already possess. When you upload a resume, extracted skills will automatically prefill this list!
        </p>

        {/* Input box to add skills */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkillInput}
            onChange={(e) => setNewSkillInput(e.target.value)}
            onKeyDown={handleKeyDownSkill}
            placeholder="Type a skill and press Enter (e.g. Next.js, Redux, PostgreSQL)"
            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddSkill()}
            disabled={!newSkillInput.trim()}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add
          </Button>
        </div>

        {/* Active skill chips */}
        <div className="min-h-[56px] p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-wrap gap-2 items-center">
          {skills.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              No skills added yet. Add skills above or upload your resume to auto-detect them.
            </span>
          ) : (
            skills.map((skill) => (
              <SkillChip
                key={skill}
                skill={skill}
                onRemove={handleRemoveSkill}
                variant="default"
              />
            ))
          )}
        </div>

        {/* Quick suggestions */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Quick Add Suggestions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => handleAddSkill(suggestion)}
                className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Default Job Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-500" />
          Default Target Job Description (Optional)
        </label>
        <textarea
          rows={5}
          placeholder="Paste standard requirements or job post responsibilities here..."
          className="block w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          {...register('jobDescription', {
            maxLength: {
              value: 10000,
              message: 'Job description cannot exceed 10,000 characters'
            }
          })}
        />
        <p className="mt-1 text-xs text-slate-500">
          Used as fallback context during resume gap analysis if no specific JD is provided for a new run.
        </p>
      </div>

      {/* Uploaded Resumes Section - Real Uploaded Documents Only */}
      <div id="resumes" className="space-y-4 pt-6 border-t border-slate-200 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Your Uploaded Resumes
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {uploadedResumes.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              List of your original uploaded resume documents. View original files, delete old versions, or upload new resumes directly.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowUploader((prev) => !prev);
              setUploadFile(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              showUploader
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {showUploader ? (
              <>
                <X className="w-3.5 h-3.5" />
                Close Uploader
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                + Upload New Resume
              </>
            )}
          </button>
        </div>

        {/* Inline Direct Resume Uploader */}
        {showUploader && (
          <div className="p-5 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <FileUp className="w-4 h-4 text-indigo-600" />
                Upload Resume Document
              </span>
              <span className="text-[11px] text-indigo-700 font-medium">Supports PDF & DOCX (Max 5MB)</span>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleSelectResumeFile(file);
              }}
              onClick={() => resumeFileInputRef.current?.click()}
              className={`p-6 rounded-xl border border-dashed text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-100/70'
                  : uploadFile
                  ? 'border-emerald-300 bg-white'
                  : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={resumeFileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSelectResumeFile(file);
                }}
                className="hidden"
              />

              {uploadFile ? (
                <div className="flex items-center justify-between max-w-md mx-auto p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{uploadFile.name}</p>
                      <p className="text-[11px] text-emerald-700">
                        {(uploadFile.size / 1024).toFixed(1)} KB • Ready to upload
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadFile(null);
                      if (resumeFileInputRef.current) resumeFileInputRef.current.value = '';
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                    title="Remove selected file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    Click to select resume or drag and drop file here
                  </p>
                  <p className="text-[11px] text-slate-500">PDF or DOCX format, up to 5MB</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUploader(false);
                  setUploadFile(null);
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDirectResumeUpload}
                disabled={!uploadFile || isUploading}
                isLoading={isUploading}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload Resume
              </Button>
            </div>
          </div>
        )}

        {/* Uploaded Resumes List - Clean Real Documents Only */}
        {uploadedResumes.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center">
            <FileText className="w-9 h-9 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 mt-2">No uploaded resumes on file</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Upload your resume document using the button above to store and manage your resumes in CareerPilot.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {uploadedResumes.map((r) => (
              <div
                key={r._id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {r.fileName || 'Resume Document'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Uploaded {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      {r.fileSize > 0 && ` • ${(r.fileSize / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setPdfModalData({
                        title: r.fileName || 'Uploaded Resume',
                        analysisId: r._id,
                        hasOriginalPdf: r.hasOriginalPdf,
                        rawResumeText: r.resumeText || ''
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/50 text-xs font-semibold text-indigo-600 transition-colors cursor-pointer"
                    title="Preview uploaded resume file"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteResume(r._id, r.fileName)}
                    disabled={deletingResumeId === r._id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-xs font-medium text-rose-600 transition-colors cursor-pointer"
                    title="Permanently remove this resume file from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingResumeId === r._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={saving}
          className="min-w-[160px]"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Preferences
        </Button>
      </div>
    </form>

    {/* Interactive Image Crop Modal */}
    <ImageCropModal
      isOpen={cropModalOpen}
      imageSrc={rawImageToCrop}
      onClose={() => setCropModalOpen(false)}
      onCropComplete={handleCropComplete}
    />

    {/* Full in-app PDF Viewer Modal */}
    {pdfModalData && (
      <PdfViewerModal
        isOpen={!!pdfModalData}
        onClose={() => setPdfModalData(null)}
        title={pdfModalData.title}
        targetRole={pdfModalData.targetRole}
        score={pdfModalData.score}
        analysisId={pdfModalData.analysisId}
        hasOriginalPdf={pdfModalData.hasOriginalPdf}
        rawResumeText={pdfModalData.rawResumeText}
      />
    )}
  </>
  );
};

export default ProfileForm;

