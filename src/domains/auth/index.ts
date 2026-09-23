export { authApi } from './api/authApi';
export { shouldRefreshOnboardingRecommendation, onboardingApi } from './api/onboardingApi';
export type {
  OnboardingStepId,
  OnboardingSubmitMode,
  OnboardingStatusView,
  RecommendedUsersView,
  RecommendedCommunitiesView,
  OnboardingSubmitResult,
} from './api/onboardingApi';
export {
  useLogin,
  useLoginWithCode,
  useRegister,
  useCompleteGoogleProfile,
  useVerifyGoogleIdToken,
  useLogout,
} from './hooks/useAuth';
export { useAuthStore } from './model/authStore';
export { onboardingPathForStatus, DEFAULT_ONBOARDING_PATH } from './model/onboardingRoute';
export {
  rememberPendingPrimaryEmail,
  readPendingPrimaryEmail,
  clearPendingPrimaryEmail,
} from './model/pendingPrimaryEmail';
export { isE164Phone } from './model/phone';
export { authKeys, onboardingKeys } from './model/queryKeys';
export type {
  AuthOnboardingStatus,
  BackendAuthSessionResponse,
  AuthSessionResponse,
  AuthAccountSecurityIdentityView,
  AuthAccountSecurityView,
  AuthSessionItemView,
  AuthSessionListView,
  LoginInput,
  LoginWithCodeInput,
  RegisterInput,
  PhoneRegistrationCodeResponse,
  PhoneIdentityVerificationPurpose,
  PhoneIdentityVerificationResponse,
  PhoneIdentityMutationResponse,
  EmailIdentityVerificationResponse,
  EmailIdentityMutationResponse,
  PasswordResetRequestInput,
  ResetPasswordInput,
  GoogleProfileInput,
  GoogleVerificationResult,
  VerificationCodeResponse,
  PasswordResetRequestResponse,
  AuthStatus,
} from './model/types';
export {
  passwordsMatch,
  verificationCodeSchema,
  strongPasswordSchema,
  passwordConfirmationFieldSchema,
} from './model/validation';
export type { PasswordConfirmationValues } from './model/validation';
export { GoogleCredentialButton } from './ui/GoogleCredentialButton';
