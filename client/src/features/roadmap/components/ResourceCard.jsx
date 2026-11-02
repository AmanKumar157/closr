import React from 'react';
import {
  Video,
  BookOpen,
  FileCode,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Globe,
  Sparkles,
  ShieldCheck,
  Search
} from 'lucide-react';

export const ResourceCard = ({
  resource,
  weekNumber,
  milestoneIndex,
  onSwap,
  onStatusChange,
  isSwapping = false
}) => {
  if (!resource) return null;

  const { type, name, whyThis, isFree, language, status, resolved } = resource;

  const typeConfig = {
    video: {
      icon: Video,
      color: 'text-red-600 bg-red-50 border-red-200',
      label: 'Video Course'
    },
    documentation: {
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      label: 'Official Docs'
    },
    article: {
      icon: Globe,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      label: 'Deep Dive Guide'
    },
    practice: {
      icon: FileCode,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      label: 'Hands-on Deliverable'
    }
  };

  const currentType = typeConfig[type] || typeConfig.article;
  const TypeIcon = currentType.icon;

  const statusColors = {
    not_started: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700',
    viewed: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-800',
    done: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800'
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm space-y-3 transition-all hover:border-slate-300 dark:hover:border-zinc-700">
      {/* Header: Type icon, Resource Name & Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`p-2 rounded-lg border shrink-0 ${currentType.color}`}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-snug truncate">
              {name}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                {currentType.label}
              </span>
              {isFree && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Free
                </span>
              )}
              {language && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                  {language.toUpperCase()}
                </span>
              )}
              {resolved?.verified ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {resolved?.channel === 'Custom' ? 'Custom Link' : 'Verified'}
                </span>
              ) : resolved?.url ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <Search className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Search Link
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={() => onSwap(weekNumber, milestoneIndex)}
          disabled={isSwapping}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors shrink-0 disabled:opacity-50"
          title="Swap with an alternative AI resource"
        >
          <RefreshCw className={`w-4 h-4 ${isSwapping ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Why this resource */}
      {whyThis && (
        <p className="text-xs text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800 italic">
          "{whyThis}"
        </p>
      )}

      {/* Video Thumbnail (if resolved videoId exists) */}
      {type === 'video' && resolved?.videoId && (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video max-h-36 bg-black">
          <img
            src={`https://img.youtube.com/vi/${resolved.videoId}/mqdefault.jpg`}
            alt={name}
            className="w-full h-full object-cover"
          />
          {resolved.channel && (
            <div className="absolute bottom-1 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white">
              {resolved.channel}
            </div>
          )}
        </div>
      )}

      {/* Action Footer: Status Selector & Open Link */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800 gap-2">
        {/* Status Dropdown/Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-400">Status:</span>
          <select
            value={status || 'not_started'}
            onChange={(e) => onStatusChange(weekNumber, milestoneIndex, e.target.value)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
              statusColors[status] || statusColors.not_started
            }`}
          >
            <option value="not_started">To Do</option>
            <option value="viewed">Learning</option>
            <option value="done">Done ✓</option>
          </select>
        </div>

        {/* External Link */}
        {resolved?.url ? (
          <a
            href={resolved.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>Open Resource</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : type === 'practice' ? (
          <span className="text-xs text-slate-400 italic">Project deliverable</span>
        ) : (
          <span className="text-xs text-slate-400 italic">Resolving link...</span>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;

