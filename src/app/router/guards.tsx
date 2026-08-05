import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onboardingPathForStatus, useAuthStore } from '@/domains/auth';
import { Spinner } from '@/shared/ui';
import styles from './guards.module.css';

function Bootstrapping() {
  return (
    <div className={styles.center}>
      <Spinner label="正在恢复会话" />
    </div>
  );
}

function LoginRedirect() {
  const location = useLocation();
  return (
    <Navigate to="/auth/login" replace state={{ from: location.pathname + location.search }} />
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  if (status === 'bootstrapping') return <Bootstrapping />;
  if (status === 'anonymous') return <LoginRedirect />;
  return children;
}

export function RequireCompletedOnboarding({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const onboardingStatus = useAuthStore((state) => state.onboardingStatus);

  if (status === 'bootstrapping') return <Bootstrapping />;
  if (status === 'anonymous') return <LoginRedirect />;
  if (!onboardingCompleted) {
    return <Navigate to={onboardingPathForStatus(onboardingStatus) ?? '/home'} replace />;
  }
  return children;
}

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const onboardingStatus = useAuthStore((state) => state.onboardingStatus);
  const location = useLocation();

  if (status === 'bootstrapping') return <Bootstrapping />;
  if (status === 'anonymous') return <LoginRedirect />;
  if (onboardingCompleted) return <Navigate to="/home" replace />;

  const expectedPath = onboardingPathForStatus(onboardingStatus);
  if (expectedPath && location.pathname !== expectedPath) {
    return <Navigate to={expectedPath} replace />;
  }
  return children;
}
