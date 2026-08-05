import { useEffect, type ReactNode } from 'react';
import { authApi, useAuthStore } from '@/domains/auth';
import { usersApi } from '@/domains/users';
import { authSession, type AuthRefreshContext } from '@/shared/api/authSession';
import { isApiError } from '@/shared/api/errors';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const setRefreshedSession = useAuthStore((state) => state.setRefreshedSession);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  useEffect(() => {
    const refreshHandler = async ({ isCurrent }: AuthRefreshContext) => {
      let session: Awaited<ReturnType<typeof authApi.refresh>>;
      try {
        session = await authApi.refresh();
      } catch {
        if (isCurrent()) setAnonymous();
        return null;
      }
      if (!isCurrent()) return null;

      setRefreshedSession(
        session.accessToken,
        session.user,
        session.onboardingCompleted,
        session.csrfToken,
        session.onboardingStatus,
      );

      try {
        const card = await usersApi.getCurrentUserCard();
        if (!isCurrent()) return null;
        updateUser({
          id: card.userId,
          handle: card.handle,
          displayName: card.displayName,
          avatarUrl: card.avatarUrl,
        });
      } catch (error: unknown) {
        if (isApiError(error) && error.httpStatus === 401) {
          if (isCurrent()) setAnonymous();
          return null;
        }
      }

      return isCurrent() ? session.accessToken : null;
    };

    authSession.configureRefresh(refreshHandler);
    void authSession.refresh();
    return () => authSession.unconfigureRefresh(refreshHandler);
  }, [setAnonymous, setRefreshedSession, updateUser]);
  return children;
}
