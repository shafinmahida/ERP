import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastNotification({ toasts, onDismiss }: ToastNotificationProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${
            t.type === 'success'
              ? 'bg-stone-900 text-white border-stone-800'
              : t.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-stone-800 text-white border-stone-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
            {t.type === 'info' && <Info className="h-4 w-4 text-amber-400 shrink-0" />}
            <div>
              <p className="text-xs font-semibold leading-snug">{t.message}</p>
              <p className="text-[10px] text-stone-400 font-mono mt-0.5">{t.timestamp}</p>
            </div>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-stone-400 hover:text-white p-1 rounded-md transition-colors ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
