import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { ToastContext, type Toast, type ToastApi, type ToastLevel } from './toastContext';
import './Toasts.css';

const AUTO_DISMISS_MS: Record<ToastLevel, number> = {
  info: 3500,
  success: 3000,
  warning: 0,
  error: 0,
};

const ICON: Record<ToastLevel, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, level: ToastLevel = 'info') => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-3), { id, level, message }]);
      const ttl = AUTO_DISMISS_MS[level];
      if (ttl > 0) {
        timers.current.set(
          id,
          setTimeout(() => {
            dismiss(id);
          }, ttl),
        );
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.level}`}
            role="status"
            data-testid="toast"
            data-level={toast.level}
          >
            <span className="toast__icon" aria-hidden="true">
              {ICON[toast.level]}
            </span>
            <span className="toast__message">{toast.message}</span>
            <button
              type="button"
              className="toast__dismiss"
              aria-label="Dismiss notification"
              onClick={() => {
                dismiss(toast.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
