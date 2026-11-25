import React, { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Bell, X } from 'lucide-react';

export const ToastBanner: React.FC = () => {
  const { toast, clearToast } = useNotification();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full bg-slate-900 text-white rounded-xl shadow-2xl p-4 border border-slate-700 animate-slide-up flex flex-col overflow-hidden">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-100 flex items-center justify-between">
            <span>{toast.title}</span>
            <button
              onClick={clearToast}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
            {toast.message}
          </p>
        </div>
      </div>

      {/* 5-second countdown progress line */}
      <div className="w-full bg-slate-800 h-1 mt-3 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full animate-toast-progress" />
      </div>
    </div>
  );
};
