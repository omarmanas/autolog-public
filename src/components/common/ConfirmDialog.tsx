import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isConfirming = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors text-slate-700 dark:text-slate-300"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={confirmDisabled || isConfirming}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
            >
            <Trash2 className="w-4 h-4" />
            <span>{isConfirming ? 'Working…' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
