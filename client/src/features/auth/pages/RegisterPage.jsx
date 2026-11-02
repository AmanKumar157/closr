import React from 'react';
import RegisterForm from '../components/RegisterForm.jsx';
import Card from '../../../components/common/Card.jsx';
import { Compass, Sparkles, CheckCircle2 } from 'lucide-react';

export const RegisterPage = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 ring-8 ring-indigo-50/50">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Get Started with closr
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Start bridging your skill gaps with AI-driven guidance
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <RegisterForm />
        </Card>

        {/* Benefits List */}
        <div className="pt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Curated Resources</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>ATS Resume Generator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

