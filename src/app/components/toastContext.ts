import { createContext, useContext } from 'react';

export type ToastLevel = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  readonly id: number;
  readonly level: ToastLevel;
  readonly message: string;
}

export interface ToastApi {
  /** Show a transient notification. `error` / `warning` persist until dismissed. */
  notify: (message: string, level?: ToastLevel) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToasts(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return api;
}
