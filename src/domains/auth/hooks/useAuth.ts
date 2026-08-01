import { useMutation } from '@tanstack/react-query';
import { authSession } from '@/shared/api/authSession';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../model/authStore';
import type {
  GoogleProfileInput,
  LoginInput,
  LoginWithCodeInput,
  RegisterInput,
} from '../model/types';

function useSessionMutation<TInput>(
  mutationFn: (input: TInput) => ReturnType<typeof authApi.login>,
) {
  const setSession = useAuthStore((state) => state.setSession);
  return useMutation({
    mutationFn,
    onSuccess: (session) =>
      setSession(session.accessToken, session.user, session.onboardingCompleted),
  });
}

export function useLogin() {
  return useSessionMutation<LoginInput>((input) => authApi.login(input));
}

export function useLoginWithCode() {
  return useSessionMutation<LoginWithCodeInput>((input) => authApi.loginWithCode(input));
}

export function useRegister() {
  return useSessionMutation<RegisterInput>((input) => authApi.register(input));
}

export function useCompleteGoogleProfile() {
  return useSessionMutation<GoogleProfileInput>((input) => authApi.completeGoogleProfile(input));
}

export function useLogout() {
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  return useMutation({
    mutationFn: authApi.logout,
    onMutate: () => {
      authSession.invalidateRefresh();
    },
    onSettled: setAnonymous,
  });
}
