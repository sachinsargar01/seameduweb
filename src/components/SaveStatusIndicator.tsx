import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Cloud, CloudOff } from 'lucide-react';
import { useSaveStatus } from '../services/saveStatusService';

interface SaveStatusIndicatorProps {
  className?: string;
  showWhenIdle?: boolean;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  className = '',
  showWhenIdle = false,
}) => {
  const { status, message } = useSaveStatus();

  if (status === 'idle' && !showWhenIdle) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
        status === 'saving'
          ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
          : status === 'saved'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs animate-in fade-in'
          : status === 'error'
          ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-xs'
          : 'bg-slate-50 text-slate-500 border border-slate-200'
      } ${className}`}
      title={message}
    >
      {status === 'saving' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <span className="font-medium">{message || 'Saving...'}</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold">{message || 'Saved ✓'}</span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="truncate max-w-[200px]" title={message}>
            {message || 'Sync error'}
          </span>
        </>
      )}

      {status === 'idle' && showWhenIdle && (
        <>
          <Cloud className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-normal">Sheet Synced</span>
        </>
      )}
    </div>
  );
};
