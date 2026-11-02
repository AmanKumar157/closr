import React from 'react';

export const Card = ({ children, className = '', title, subtitle, footer, ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden transition-all text-slate-900 dark:text-zinc-100 ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80">
          {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800">{footer}</div>}
    </div>
  );
};

export default Card;

