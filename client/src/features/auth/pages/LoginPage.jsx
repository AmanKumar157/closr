import React from 'react';
import LoginForm from '../components/LoginForm.jsx';
import MagicCard from '../../../components/common/MagicCard.jsx';
import BorderBeam from '../../../components/common/BorderBeam.jsx';
import { useTheme } from '../../../context/ThemeContext.jsx';
import { Compass, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const { isDark } = useTheme();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-secondary text-primary mb-4 ring-8 ring-secondary/40 shadow-sm transition-transform hover:scale-105 duration-200">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Sign in to closr
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Close the gap between your resume and your dream job
          </p>
        </div>

        {/* MagicCard + Pure-SVG BorderBeam (Hollow Interior, Zero Bleed-Through) */}
        <MagicCard
          gradientColor={isDark ? 'rgba(144, 170, 225, 0.16)' : 'rgba(90, 125, 175, 0.12)'}
          gradientSize={240}
          className="shadow-2xl border border-border bg-card rounded-2xl relative group overflow-hidden"
        >
          <div className="p-5 sm:p-8 relative z-10">
            <LoginForm />
          </div>
          <BorderBeam
            hoverOnly={true}
            duration={6}
            size={22}
            borderWidth={1.5}
            rx={16}
            colorFrom={isDark ? '#38bdf8' : '#0284c7'}
            colorTo={isDark ? '#818cf8' : '#6366f1'}
          />
        </MagicCard>

        {/* Value Proposition Highlights */}
        <div className="pt-2 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>AI Resume Gap Analysis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>12-Week Custom Roadmap</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
