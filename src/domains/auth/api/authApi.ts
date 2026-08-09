import { apiClient } from '@/shared/api/client';
import type { UserSummary } from '@/domains/users/model/types';
import type {
  AuthSessionResponse,
  BackendAuthSessionResponse,
  GoogleProfileInput,
  GoogleVerificationResult,
  LoginInput,
  LoginWithCodeInput,
  PasswordResetRequestInput,
  PasswordResetRequestResponse,
  PhoneRegistrationCodeResponse,
  RegisterInput,
  ResetPasswordInput,
  VerificationCodeResponse,
} from '../model/types';

function inferHandle(identifier: string): string | null {
  const value = identifier.trim().replace(/^@/, '');
  if (!/^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(value)) return null;
  return value;
}

function toSession(
  response: BackendAuthSessionResponse,
  userHint: Partial<UserSummary> = {},
): AuthSessionResponse {
  const handle = userHint.handle ?? '';
  return {
    accessToken: response.accessToken,
    csrfToken: response.csrfToken,
    user: {
      id: response.userId,
      handle,
      displayName: userHint.displayName ?? (handle || '用户'),
      avatarUrl: userHint.avatarUrl ?? null,
    },
    onboardingStatus: response.onboardingStatus,
    onboardingCompleted:
      response.onboardingStatus === 'COMPLETED' || response.onboardingStatus === 'SKIPPED',
  };
}

export const authApi = {
  login: async (input: LoginInput) => {
    const response = await apiClient.request<
      BackendAuthSessionResponse,
      { loginIdentifier: string; password: string; deviceName: null }
    >({
      method: 'POST',
      path: '/api/auth/login/password',
      body: {
        loginIdentifier: input.identifier.trim(),
        password: input.password,
        deviceName: null,
      },
      auth: false,
      retry401: false,
    });
    const handle = inferHandle(input.identifier);
    return toSession(response, handle ? { handle, displayName: handle } : {});
  },

  requestLoginCode: async (input: Pick<LoginWithCodeInput, 'identifier'>) => {
    const response = await apiClient.request<
      { requested: true; expiresInSeconds: number },
      { phone: string; regionCode: null }
    >({
      method: 'POST',
      path: '/api/auth/login/code/request',
      body: { phone: input.identifier.trim(), regionCode: null },
      auth: false,
      retry401: false,
    });
    return {
      ...response,
      retryAfterSeconds: response.expiresInSeconds,
    } satisfies VerificationCodeResponse;
  },

  loginWithCode: async (input: LoginWithCodeInput) => {
    const response = await apiClient.request<
      BackendAuthSessionResponse,
      { phone: string; regionCode: null; code: string; deviceName: null }
    >({
      method: 'POST',
      path: '/api/auth/login/code/confirm',
      body: {
        phone: input.identifier.trim(),
        regionCode: null,
        code: input.code,
        deviceName: null,
      },
      auth: false,
      retry401: false,
    });
    return toSession(response);
  },

  requestPhoneRegistrationCode: async (input: { phone: string }) => {
    const response = await apiClient.request<
      { accepted: true; expiresAt: string | null },
      { purpose: 'REGISTER_PHONE_VERIFY'; phone: string }
    >({
      method: 'POST',
      path: '/api/auth/verification/phone/request',
      body: { purpose: 'REGISTER_PHONE_VERIFY', phone: input.phone.trim() },
      auth: false,
      retry401: false,
    });
    return {
      ...response,
      retryAfterSeconds: 60,
    } satisfies PhoneRegistrationCodeResponse;
  },

  register: async (input: RegisterInput) => {
    const handle = input.handle.trim();
    const response =
      input.mode === 'email'
        ? await apiClient.request<
            BackendAuthSessionResponse,
            { email: string; password: string; handle: string; deviceName: null }
          >({
            method: 'POST',
            path: '/api/auth/register/email',
            body: {
              email: input.email.trim(),
              password: input.password,
              handle,
              deviceName: null,
            },
            auth: false,
            retry401: false,
            idempotencyKey: crypto.randomUUID(),
          })
        : await apiClient.request<
            BackendAuthSessionResponse,
            {
              phone: string;
              code: string;
              password: string;
              handle: string;
              deviceName: null;
            }
          >({
            method: 'POST',
            path: '/api/auth/register/phone',
            body: {
              phone: input.phone.trim(),
              code: input.code,
              password: input.password,
              handle,
              deviceName: null,
            },
            auth: false,
            retry401: false,
            idempotencyKey: crypto.randomUUID(),
          });
    return toSession(response, { handle, displayName: handle });
  },

  requestPasswordReset: (input: PasswordResetRequestInput) =>
    apiClient.request<PasswordResetRequestResponse, { loginIdentifier: string }>({
      method: 'POST',
      path: '/api/auth/password/reset/request',
      body: { loginIdentifier: input.identifier.trim() },
      auth: false,
      retry401: false,
    }),

  resetPassword: (input: ResetPasswordInput) => {
    const body =
      input.resetType === 'LINK'
        ? { resetType: 'LINK' as const, token: input.token, newPassword: input.password }
        : {
            resetType: 'CODE' as const,
            phone: input.phone.trim(),
            code: input.code,
            newPassword: input.password,
          };
    return apiClient.request<{ reset: true; userId: string; securityVersion: number }, typeof body>(
      {
        method: 'POST',
        path: '/api/auth/password/reset/confirm',
        body,
        auth: false,
        retry401: false,
        idempotencyKey: crypto.randomUUID(),
      },
    );
  },

  verifyGoogleIdToken: async (idToken: string): Promise<GoogleVerificationResult> => {
    const response = await apiClient.request<
      | { mode: 'LOGIN_SUCCESS'; authSession: BackendAuthSessionResponse }
      | {
          mode: 'PROFILE_COMPLETION_REQUIRED';
          pendingUserId: string;
          completionToken: string;
          completionTokenExpiresInSeconds: number;
          oauthProfile: {
            email: string | null;
            displayName: string | null;
            avatarUrl: string | null;
          };
        },
      { idToken: string; deviceName: null }
    >({
      method: 'POST',
      path: '/api/auth/oauth/google/verify-id-token',
      body: { idToken, deviceName: null },
      auth: false,
      retry401: false,
    });
    if (response.mode === 'LOGIN_SUCCESS') {
      return { mode: response.mode, authSession: toSession(response.authSession) };
    }
    return response;
  },

  completeGoogleProfile: async (input: GoogleProfileInput) => {
    const response = await apiClient.request<
      BackendAuthSessionResponse,
      GoogleProfileInput & { deviceName: null }
    >({
      method: 'POST',
      path: '/api/auth/oauth/google/complete-profile',
      body: { ...input, deviceName: null },
      auth: false,
      retry401: false,
      idempotencyKey: crypto.randomUUID(),
    });
    return toSession(response, { handle: input.handle, displayName: input.handle });
  },

  refresh: async () => {
    const response = await apiClient.request<BackendAuthSessionResponse>({
      method: 'POST',
      path: '/api/auth/refresh',
      auth: false,
      retry401: false,
    });
    return toSession(response);
  },

  logout: () =>
    apiClient.request<void>({
      method: 'POST',
      path: '/api/auth/logout',
      retry401: false,
    }),
};
