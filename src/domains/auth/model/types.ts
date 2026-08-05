import type { UserSummary } from '@/domains/users/model/types';

export type AuthOnboardingStatus =
  | 'PENDING_HANDLE'
  | 'PENDING_INTERESTS'
  | 'PENDING_RECOMMENDED_USERS'
  | 'PENDING_RECOMMENDED_COMMUNITIES'
  | 'PENDING_COMPLETE'
  | 'COMPLETED'
  | 'SKIPPED';

export interface BackendAuthSessionResponse {
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  csrfToken: string;
  session: {
    sessionId: string;
    authMethod: 'PASSWORD' | 'PHONE_CODE' | 'GOOGLE_ID_TOKEN';
    deviceName: string | null;
    lastSeenAt: string | null;
    expiresAt: string;
  };
  onboardingStatus: AuthOnboardingStatus;
}

export interface AuthSessionResponse {
  accessToken: string;
  csrfToken: string;
  user: UserSummary;
  onboardingStatus: AuthOnboardingStatus;
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
  handle: string;
  password: string;
}

export interface PasswordResetRequestInput {
  identifier: string;
}

export type ResetPasswordInput =
  | {
      resetType: 'LINK';
      token: string;
      password: string;
    }
  | {
      resetType: 'CODE';
      phone: string;
      code: string;
      password: string;
    };

export interface GoogleProfileInput {
  pendingUserId: string;
  completionToken: string;
  handle: string;
}

export type GoogleVerificationResult =
  | {
      mode: 'LOGIN_SUCCESS';
      authSession: AuthSessionResponse;
    }
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
    };

export interface VerificationCodeResponse {
  requested: true;
  expiresInSeconds: number;
  retryAfterSeconds: number;
}

export interface PasswordResetRequestResponse {
  requested: true;
}

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';
