import type { UserSummary } from '@/domains/users/model/types';

export interface AuthSessionResponse {
  accessToken: string;
  user: UserSummary;
  onboardingCompleted: boolean;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface LoginWithCodeInput {
  identifier: string;
  code: string;
}

export interface RegisterInput {
  email: string;
  code: string;
  password: string;
}

export interface PasswordResetRequestInput {
  identifier: string;
}

export interface ResetPasswordInput {
  identifier: string;
  code: string;
  password: string;
}

export interface GoogleProfileInput {
  displayName: string;
  handle: string;
  bio?: string;
}

export interface VerificationCodeResponse {
  retryAfterSeconds: number;
}

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';
