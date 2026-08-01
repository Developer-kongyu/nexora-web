import { useEffect, type ReactNode } from 'react';
import { authApi, useAuthStore } from '@/domains/auth';
import { authSession, type AuthRefreshContext } from '@/shared/api/authSession';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const setRefreshedSession = useAuthStore((state) => state.setRefreshedSession);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  useEffect(() => {
    const refreshHandler = async ({ isCurrent }: AuthRefreshContext) => {
      try {
        const session = await authApi.refresh();
        if (!isCurrent()) return null;
        setRefreshedSession(session.accessToken, session.user, session.onboardingCompleted);
        return session.accessToken;
      } catch {
        if (isCurrent()) setAnonymous();
        return null;
      }
    };

    authSession.configureRefresh(refreshHandler);
    void authSession.refresh();
    return () => authSession.unconfigureRefresh(refreshHandler);
  }, [setAnonymous, setRefreshedSession]);
  return children;
}
