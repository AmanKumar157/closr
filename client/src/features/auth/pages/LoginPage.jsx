import React from 'react';
import LoginForm from '../components/LoginForm.jsx';
import Card from '../../../components/common/Card.jsx';
import { Compass, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 ring-8 ring-indigo-50/50">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign in to CareerPilot
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Close the gap between your resume and your dream job
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <LoginForm />
        </Card>

        {/* Value Proposition Highlights */}
        <div className="pt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>AI Resume Gap Analysis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>12-Week Custom Roadmap</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

