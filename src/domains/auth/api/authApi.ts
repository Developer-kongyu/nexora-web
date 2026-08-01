import { apiClient } from '@/shared/api/client';
import type {
  AuthSessionResponse,
  GoogleProfileInput,
  LoginInput,
  LoginWithCodeInput,
  PasswordResetRequestInput,
  RegisterInput,
  ResetPasswordInput,
  VerificationCodeResponse,
} from '../model/types';

export const authApi = {
  login: (input: LoginInput) =>
    apiClient.request<AuthSessionResponse, LoginInput>({
      method: 'POST',
      path: '/api/auth/login/password',
      body: input,
      auth: false,
      retry401: false,
    }),
  requestLoginCode: (input: Pick<LoginWithCodeInput, 'identifier'>) =>
    apiClient.request<VerificationCodeResponse, Pick<LoginWithCodeInput, 'identifier'>>({
      method: 'POST',
      path: '/api/auth/login/code/request',
      body: input,
      auth: false,
      retry401: false,
    }),
  loginWithCode: (input: LoginWithCodeInput) =>
    apiClient.request<AuthSessionResponse, LoginWithCodeInput>({
      method: 'POST',
      path: '/api/auth/login/code',
      body: input,
      auth: false,
      retry401: false,
    }),
  requestRegistrationCode: (input: { email: string }) =>
    apiClient.request<VerificationCodeResponse, { email: string }>({
      method: 'POST',
      path: '/api/auth/register/code/request',
      body: input,
      auth: false,
      retry401: false,
    }),
  register: (input: RegisterInput) =>
    apiClient.request<AuthSessionResponse, RegisterInput>({
      method: 'POST',
      path: '/api/auth/register',
      body: input,
      auth: false,
      retry401: false,
      idempotencyKey: crypto.randomUUID(),
    }),
  requestPasswordReset: (input: PasswordResetRequestInput) =>
    apiClient.request<VerificationCodeResponse, PasswordResetRequestInput>({
      method: 'POST',
      path: '/api/auth/password/reset/request',
      body: input,
      auth: false,
      retry401: false,
    }),
  resetPassword: (input: ResetPasswordInput) =>
    apiClient.request<void, ResetPasswordInput>({
      method: 'POST',
      path: '/api/auth/password/reset',
      body: input,
      auth: false,
      retry401: false,
      idempotencyKey: crypto.randomUUID(),
    }),
  completeGoogleProfile: (input: GoogleProfileInput) =>
    apiClient.request<AuthSessionResponse, GoogleProfileInput>({
      method: 'POST',
      path: '/api/auth/google/complete',
      body: input,
      auth: false,
      retry401: false,
    }),
  refresh: () =>
    apiClient.request<AuthSessionResponse>({
      method: 'POST',
      path: '/api/auth/refresh',
      auth: false,
      retry401: false,
    }),
  logout: () => apiClient.request<void>({ method: 'POST', path: '/api/auth/logout' }),
};
