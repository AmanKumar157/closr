import React from 'react';
import ProfileForm from '../components/ProfileForm.jsx';
import Card from '../../../components/common/Card.jsx';
import { UserCog, Compass, Sparkles, CheckCircle2 } from 'lucide-react';

export const ProfilePage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
            <UserCog className="w-4 h-4" />
            <span>Profile & Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Target Career Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define your dream job role and current skills to customize AI analysis and roadmap creation.
          </p>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-sm">
        <ProfileForm />
      </Card>

      {/* Helpful Hint Card */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-5 border border-indigo-100/80">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-indigo-950">
              How CareerPilot uses your profile:
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed">
              When you upload a resume in the next phase, the AI compares your resume text and target role to pinpoint high-importance missing skills. If your profile skills list is empty, CareerPilot will automatically prefill your profile with the skills extracted from your resume!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

