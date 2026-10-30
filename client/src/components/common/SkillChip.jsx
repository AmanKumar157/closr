import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export const SkillChip = ({
  skill,
  onRemove,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variants = {
    default: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    matched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    missing: 'bg-rose-50 text-rose-700 border-rose-200',
    high: 'bg-red-50 text-red-700 border-red-200 font-semibold',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-medium transition-all ${
        variants[variant] || variants.default
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {variant === 'matched' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
      {variant === 'missing' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
      <span>{skill}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(skill);
          }}
          className="ml-1 text-slate-400 hover:text-slate-700 focus:outline-none transition-colors"
          title={`Remove ${skill}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
};

export default SkillChip;

