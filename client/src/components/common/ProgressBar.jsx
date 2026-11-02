import React from 'react';

export const ProgressBar = ({
  value = 0,
  max = 100,
  label,
  subLabel,
  color = 'indigo',
  size = 'md',
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const colorVariants = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-600',
    amber: 'bg-amber-500'
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || subLabel) && (
        <div className="flex justify-between items-center text-xs font-semibold">
          {label && <span className="text-slate-700 dark:text-zinc-300">{label}</span>}
          {subLabel ? (
            <span className="text-slate-500 dark:text-zinc-400 font-medium">{subLabel}</span>
          ) : (
            <span className="text-indigo-600 dark:text-indigo-400">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden ${heights[size] || heights.md}`}>
        <div
          className={`${colorVariants[color] || colorVariants.indigo} ${heights[size] || heights.md} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

