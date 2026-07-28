import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-bounce-short pointer-events-none">
      <div className="bg-slate-900/95 dark:bg-slate-100/95 text-slate-100 dark:text-slate-900 border border-slate-700 dark:border-slate-300 shadow-xl rounded-lg p-3.5 flex items-center gap-3 backdrop-blur-md pointer-events-auto">
        {icons[toast.type]}
        <p className="text-xs font-medium leading-snug flex-1">{toast.message}</p>
      </div>
    </div>
  );
};
