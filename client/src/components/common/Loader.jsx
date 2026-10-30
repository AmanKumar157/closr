import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loader = ({ size = 'md', text = 'Loading...', inline = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10'
  };

  const content = (
    <div className={`flex items-center justify-center gap-3 text-indigo-600 ${inline ? 'inline-flex' : 'flex-col p-4'}`}>
      <Loader2 className={`${sizeClasses[size] || sizeClasses.md} animate-spin`} />
      {text && <span className="text-sm font-medium text-slate-600">{text}</span>}
    </div>
  );

  return content;
};

export default Loader;

