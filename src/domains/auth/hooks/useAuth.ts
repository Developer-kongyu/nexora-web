import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/domains/users';
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
      setSession(
        session.accessToken,
        session.user,
        session.onboardingCompleted,
        session.csrfToken,
        session.onboardingStatus,
      ),
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

export function useVerifyGoogleIdToken() {
  const setSession = useAuthStore((state) => state.setSession);
  const updateUser = useAuthStore((state) => state.updateUser);
  return useMutation({
    mutationFn: authApi.verifyGoogleIdToken,
    onSuccess: async (result) => {
      if (result.mode !== 'LOGIN_SUCCESS') return;
      const session = result.authSession;
      setSession(
        session.accessToken,
        session.user,
        session.onboardingCompleted,
        session.csrfToken,
        session.onboardingStatus,
      );

      try {
        const card = await usersApi.getCurrentUserCard();
        updateUser({
          id: card.userId,
          handle: card.handle,
          displayName: card.displayName,
          avatarUrl: card.avatarUrl,
        });
      } catch {
        // 会话已经由后端 ID Token 校验建立；用户卡暂时不可用不应回滚登录。
      }
    },
  });
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
