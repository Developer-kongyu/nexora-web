import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { Spinner } from '@/shared/ui';
import styles from './guards.module.css';

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  if (status === 'bootstrapping')
    return (
      <div className={styles.center}>
        <Spinner label="正在恢复会话" />
      </div>
    );
  if (status === 'anonymous')
    return (
      <Navigate to="/auth/login" replace state={{ from: location.pathname + location.search }} />
    );
  return children;
}
