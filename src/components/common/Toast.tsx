import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { Card } from './Card';

type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastMessageProps {
  message: string;
  type: ToastSeverity;
}

export const ToastMessage: React.FC<ToastMessageProps> = ({
  message,
  type,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  };

  return (
    <Card
      className="toast-card"
      role={type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
    >
      {icons[type]}
      <p className="text-xs font-medium leading-snug flex-1">{message}</p>
    </Card>
  );
};

export const ToastNotification: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  return (
    <div className="toast-region fixed top-4 right-4 z-50 animate-bounce-short pointer-events-none">
      <ToastMessage message={toast.message} type={toast.type} />
    </div>
  );
};
