import React, { forwardRef } from 'react';

export const Input = forwardRef(
  ({ label, error, helperText, icon: Icon, className = '', containerClassName = '', type = 'text', ...props }, ref) => {
    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`block w-full rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              Icon ? 'pl-10' : 'pl-3'
            } pr-3 py-2.5 ${
              error
                ? 'border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 placeholder-red-300 dark:placeholder-red-700 focus:border-red-500 focus:ring-red-500 bg-red-50/30 dark:bg-red-950/20'
                : 'border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-zinc-900'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

