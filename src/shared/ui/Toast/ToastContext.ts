import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

export interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const fallbackToastContext: ToastContextValue = { showToast: () => undefined };
export const ToastContext = createContext<ToastContextValue | null>(null);
