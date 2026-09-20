import React from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  recordName?: string;
  recordId?: string;
  recordDetails?: { label: string; value: string | number | undefined | null }[];
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  recordName,
  recordId,
  recordDetails = [],
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-rose-700 font-medium">Permanent Deletion Confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed text-slate-700 font-medium">{description}</p>

          {/* Record card */}
          {(recordName || recordId || recordDetails.length > 0) && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              {recordName && (
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Target Record:</span>
                  <span className="font-bold text-slate-900">{recordName}</span>
                </div>
              )}
              {recordId && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Record ID:</span>
                  <span className="font-mono text-indigo-600 font-bold">{recordId}</span>
                </div>
              )}
              {recordDetails.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{detail.label}:</span>
                  <span className="font-medium text-slate-800">{detail.value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sheets Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>Google Sheet Synchronization</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              The matching row will be permanently removed from the connected Google Sheet immediately.
              A soft-archive copy is preserved in the Admin Audit Archive.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting from Sheet...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
