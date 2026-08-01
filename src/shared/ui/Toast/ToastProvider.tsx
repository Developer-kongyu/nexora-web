import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastMessage } from './ToastContext';
import styles from './ToastProvider.module.css';

const MAX_VISIBLE_TOASTS = 3;
const TOAST_DURATION_MS = 3_600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const mountedRef = useRef(true);
  const visibleToastIdsRef = useRef<string[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const clearToastTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer === undefined) return;
    window.clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearToastTimer(id);
      if (!mountedRef.current) return;
      visibleToastIdsRef.current = visibleToastIdsRef.current.filter((toastId) => toastId !== id);
      setToasts((items) => items.filter((item) => item.id !== id));
    },
    [clearToastTimer],
  );

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      if (!mountedRef.current) return;

      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const retainedIds = visibleToastIdsRef.current.slice(-(MAX_VISIBLE_TOASTS - 1));
      const retainedIdSet = new Set(retainedIds);

      for (const evictedId of visibleToastIdsRef.current) {
        if (!retainedIdSet.has(evictedId)) clearToastTimer(evictedId);
      }

      visibleToastIdsRef.current = [...retainedIds, id];
      setToasts((items) => [
        ...items.filter((item) => retainedIdSet.has(item.id)),
        { ...toast, id },
      ]);

      const timer = window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [clearToastTimer, dismiss],
  );

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;

    return () => {
      mountedRef.current = false;
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      visibleToastIdsRef.current = [];
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'error'
                ? XCircle
                : toast.tone === 'warning'
                  ? AlertTriangle
                  : Info;
          return (
            <div key={toast.id} className={styles.toast} data-tone={toast.tone} role="status">
              <Icon size={20} />
              <span>
                <strong>{toast.title}</strong>
                {toast.description ? <small>{toast.description}</small> : null}
              </span>
              <button type="button" aria-label="关闭提示" onClick={() => dismiss(toast.id)}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
