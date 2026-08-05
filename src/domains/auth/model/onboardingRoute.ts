import type { AuthOnboardingStatus } from './types';

export const DEFAULT_ONBOARDING_PATH = '/onboarding/interests';

export function onboardingPathForStatus(status: AuthOnboardingStatus | null): string | null {
  switch (status) {
    case 'PENDING_RECOMMENDED_USERS':
      return '/onboarding/follow';
    case 'PENDING_RECOMMENDED_COMMUNITIES':
    case 'PENDING_COMPLETE':
      return '/onboarding/communities';
    case 'PENDING_HANDLE':
    case 'PENDING_INTERESTS':
      return DEFAULT_ONBOARDING_PATH;
    case 'COMPLETED':
    case 'SKIPPED':
      return null;
    default:
      return DEFAULT_ONBOARDING_PATH;
  }
}
