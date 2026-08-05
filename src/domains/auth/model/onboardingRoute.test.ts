import { describe, expect, it } from 'vitest';
import { DEFAULT_ONBOARDING_PATH, onboardingPathForStatus } from './onboardingRoute';

describe('onboardingPathForStatus', () => {
  it.each([
    ['PENDING_HANDLE', DEFAULT_ONBOARDING_PATH],
    ['PENDING_INTERESTS', DEFAULT_ONBOARDING_PATH],
    ['PENDING_RECOMMENDED_USERS', '/onboarding/follow'],
    ['PENDING_RECOMMENDED_COMMUNITIES', '/onboarding/communities'],
    ['PENDING_COMPLETE', '/onboarding/communities'],
    ['COMPLETED', null],
    ['SKIPPED', null],
  ] as const)('maps %s to %s', (status, expected) => {
    expect(onboardingPathForStatus(status)).toBe(expected);
  });

  it('falls back to the first implemented step when session status is unavailable', () => {
    expect(onboardingPathForStatus(null)).toBe(DEFAULT_ONBOARDING_PATH);
  });
});
