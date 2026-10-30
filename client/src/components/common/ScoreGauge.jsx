import React from 'react';

export const ScoreGauge = ({ score = 0, size = 'md', label = 'ATS Match Score' }) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  // Determine color scheme based on score range
  const getColor = (s) => {
    if (s >= 75) {
      return {
        text: 'text-emerald-600',
        stroke: '#10b981',
        bgStroke: '#d1fae5',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        verdict: 'Strong Match'
      };
    }
    if (s >= 50) {
      return {
        text: 'text-amber-600',
        stroke: '#f59e0b',
        bgStroke: '#fef3c7',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        verdict: 'Moderate Gap'
      };
    }
    return {
      text: 'text-rose-600',
      stroke: '#f43f5e',
      bgStroke: '#ffe4e6',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      verdict: 'High Skill Gap'
    };
  };

  const scheme = getColor(safeScore);

  const dimensions = {
    sm: { width: 100, radius: 40, strokeWidth: 8, fontSize: 'text-xl' },
    md: { width: 150, radius: 60, strokeWidth: 10, fontSize: 'text-3xl' },
    lg: { width: 200, radius: 80, strokeWidth: 14, fontSize: 'text-5xl' }
  };

  const dim = dimensions[size] || dimensions.md;
  const circumference = 2 * Math.PI * dim.radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={dim.width}
          height={dim.width}
          className="transform -rotate-90"
        >
          {/* Background Track Circle */}
          <circle
            cx={dim.width / 2}
            cy={dim.width / 2}
            r={dim.radius}
            stroke={scheme.bgStroke}
            strokeWidth={dim.strokeWidth}
            fill="transparent"
          />
          {/* Progress Colored Arc */}
          <circle
            cx={dim.width / 2}
            cy={dim.width / 2}
            r={dim.radius}
            stroke={scheme.stroke}
            strokeWidth={dim.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`font-extrabold ${dim.fontSize} ${scheme.text} tracking-tight`}>
            {safeScore}%
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Score
          </span>
        </div>
      </div>

      {label && <p className="mt-3 text-sm font-semibold text-slate-800">{label}</p>}
      <span
        className={`mt-1 inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${scheme.badge}`}
      >
        {scheme.verdict}
      </span>
    </div>
  );
};

export default ScoreGauge;

