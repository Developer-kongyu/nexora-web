const AUTH_QUERY_ROOT = ['auth'] as const;
const ONBOARDING_QUERY_ROOT = [...AUTH_QUERY_ROOT, 'onboarding'] as const;

export const authKeys = {
  all: AUTH_QUERY_ROOT,
  accountSecurity: [...AUTH_QUERY_ROOT, 'account-security'] as const,
  sessions: [...AUTH_QUERY_ROOT, 'sessions'] as const,
  emailVerification: (token: string) => [...AUTH_QUERY_ROOT, 'email-verification', token] as const,
};

export const onboardingKeys = {
  all: ONBOARDING_QUERY_ROOT,
  status: [...ONBOARDING_QUERY_ROOT, 'status'] as const,
  recommendedUsers: [...ONBOARDING_QUERY_ROOT, 'recommended-users'] as const,
  recommendedCommunities: [...ONBOARDING_QUERY_ROOT, 'recommended-communities'] as const,
};
