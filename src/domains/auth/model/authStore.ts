import { create } from 'zustand';
import type { UserSummary } from '@/domains/users/model/types';
import { authSession } from '@/shared/api/authSession';
import type { AuthOnboardingStatus, AuthStatus } from './types';

interface AuthState {
  status: AuthStatus;
  user: UserSummary | null;
  onboardingCompleted: boolean;
  onboardingStatus: AuthOnboardingStatus | null;
  setSession: (
    token: string,
    user: UserSummary,
    onboardingCompleted: boolean,
    csrfToken?: string,
    onboardingStatus?: AuthOnboardingStatus,
  ) => void;
  setRefreshedSession: (
    token: string,
    user: UserSummary,
    onboardingCompleted: boolean,
    csrfToken?: string,
    onboardingStatus?: AuthOnboardingStatus,
  ) => void;
  updateUser: (patch: Partial<UserSummary>) => void;
  setAnonymous: () => void;
  setBootstrapping: () => void;
}

interface AuthenticatedState {
  status: 'authenticated';
  user: UserSummary;
  onboardingCompleted: boolean;
  onboardingStatus: AuthOnboardingStatus | null;
}

function commitSession(
  setState: (state: AuthenticatedState) => void,
  token: string,
  user: UserSummary,
  onboardingCompleted: boolean,
  invalidateInFlightRefresh: boolean,
  csrfToken?: string,
  onboardingStatus: AuthOnboardingStatus | null = null,
): void {
  if (invalidateInFlightRefresh) authSession.invalidateRefresh();
  authSession.setAccessToken(token);
  if (csrfToken) authSession.setCsrfToken(csrfToken);
  setState({ status: 'authenticated', user, onboardingCompleted, onboardingStatus });
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  user: null,
  onboardingCompleted: false,
  onboardingStatus: null,
  setSession: (token, user, onboardingCompleted, csrfToken, onboardingStatus) => {
    commitSession(set, token, user, onboardingCompleted, true, csrfToken, onboardingStatus ?? null);
  },
  setRefreshedSession: (token, user, onboardingCompleted, csrfToken, onboardingStatus) => {
    commitSession(
      set,
      token,
      user,
      onboardingCompleted,
      false,
      csrfToken,
      onboardingStatus ?? null,
    );
  },
  updateUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : null })),
  setAnonymous: () => {
    authSession.clear();
    set({
      status: 'anonymous',
      user: null,
      onboardingCompleted: false,
      onboardingStatus: null,
    });
  },
  setBootstrapping: () => set({ status: 'bootstrapping' }),
}));
