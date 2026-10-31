import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
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
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import profileService from '../../../services/profileService.js';
import { useAuth } from '../../../hooks/useAuth.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import SkillChip from '../../../components/common/SkillChip.jsx';
import Loader from '../../../components/common/Loader.jsx';
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

  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      targetRole: '',
      jobDescription: '',
      preferredLanguage: 'en'
    }
  });

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
        }
      } catch (err) {
        toast.error('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [reset, user?.avatar]);

  // When user selects a photo, automatically open the crop modal
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

  // Called when user finishes cropping inside ImageCropModal
  const handleCropComplete = (croppedBase64) => {
    setAvatar(croppedBase64);
    toast.success('Photo cropped! Click "Save Preferences" to persist.');
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
        <div id="photo" className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-2xs">
          {/* Strictly 80px by 80px Avatar Circle Container */}
          <div className="relative group shrink-0" style={{ width: '80px', height: '80px' }}>
            <div
              className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-indigo-500/20 border-2 border-white shadow-md bg-slate-100 flex items-center justify-center"
              style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px', maxWidth: '80px', maxHeight: '80px' }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="w-full h-full object-cover block"
                  style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px', maxWidth: '80px', maxHeight: '80px', objectFit: 'cover' }}
                />
              ) : (
                <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-9 h-9 text-indigo-500" />}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
              title="Change photo"
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
                {avatar ? 'Change Photo' : 'Upload Photo'}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
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
            Skills you already possess. CareerPilot evaluates your skill gap against this list.
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
                No skills added yet. Add skills above to track your strengths.
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

      {/* Interactive Image Crop Modal (Prompts user to crop when uploading) */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={rawImageToCrop}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};

export default ProfileForm;
