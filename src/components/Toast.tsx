import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss?: (id: string) => void;
  onRemoveToast?: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss, onRemoveToast }) => {
  const handleDismiss = onDismiss || onRemoveToast || (() => {});
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-emerald-700 text-white border-emerald-800';
        let icon = <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />;

        if (toast.type === 'error') {
          bg = 'bg-rose-700 text-white border-rose-800';
          icon = <AlertCircle className="w-5 h-5 shrink-0 text-rose-200" />;
        } else if (toast.type === 'info') {
          bg = 'bg-sky-700 text-white border-sky-800';
          icon = <Info className="w-5 h-5 shrink-0 text-sky-200" />;
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg shadow-lg border text-sm font-medium ${bg} transition-all transform translate-y-0`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span>{toast.message}</span>
            </div>
            <button
              id={`btn-close-toast-${toast.id}`}
              onClick={() => handleDismiss(toast.id)}
              className="p-1 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white ml-3"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const Toast = ToastContainer;
