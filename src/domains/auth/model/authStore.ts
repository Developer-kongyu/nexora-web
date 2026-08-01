import { create } from 'zustand';
import type { UserSummary } from '@/domains/users/model/types';
import { authSession } from '@/shared/api/authSession';
import type { AuthStatus } from './types';

interface AuthState {
  status: AuthStatus;
  user: UserSummary | null;
  onboardingCompleted: boolean;
  setSession: (token: string, user: UserSummary, onboardingCompleted: boolean) => void;
  setRefreshedSession: (
    token: string,
    user: UserSummary,
    onboardingCompleted: boolean,
  ) => void;
  updateUser: (patch: Partial<UserSummary>) => void;
  setAnonymous: () => void;
  setBootstrapping: () => void;
}

interface AuthenticatedState {
  status: 'authenticated';
  user: UserSummary;
  onboardingCompleted: boolean;
}

function commitSession(
  setState: (state: AuthenticatedState) => void,
  token: string,
  user: UserSummary,
  onboardingCompleted: boolean,
  invalidateInFlightRefresh: boolean,
): void {
  if (invalidateInFlightRefresh) authSession.invalidateRefresh();
  authSession.setAccessToken(token);
  setState({ status: 'authenticated', user, onboardingCompleted });
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  user: null,
  onboardingCompleted: false,
  setSession: (token, user, onboardingCompleted) => {
    commitSession(set, token, user, onboardingCompleted, true);
  },
  setRefreshedSession: (token, user, onboardingCompleted) => {
    commitSession(set, token, user, onboardingCompleted, false);
  },
  updateUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : null })),
  setAnonymous: () => {
    authSession.clear();
    set({ status: 'anonymous', user: null, onboardingCompleted: false });
  },
  setBootstrapping: () => set({ status: 'bootstrapping' }),
}));
