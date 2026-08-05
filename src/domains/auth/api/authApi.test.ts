import { describe, expect, it } from 'vitest';
import { authApi, onboardingApi } from '@/domains/auth';

describe('authApi default MSW contract', () => {
  it('uses the canonical password, phone-code, and email-registration routes', async () => {
    const passwordSession = await authApi.login({ identifier: '@tester', password: 'Password123' });
    expect(passwordSession).toMatchObject({
      user: { id: 'user-current', handle: 'tester' },
      onboardingStatus: 'COMPLETED',
      onboardingCompleted: true,
    });

    const requested = await authApi.requestLoginCode({ identifier: '+8613800138000' });
    expect(requested).toEqual({
      requested: true,
      expiresInSeconds: 600,
      retryAfterSeconds: 600,
    });

    const phoneSession = await authApi.loginWithCode({
      identifier: '+8613800138000',
      code: '123456',
    });
    expect(phoneSession.onboardingStatus).toBe('COMPLETED');

    const registered = await authApi.register({
      email: 'tester@example.com',
      handle: 'tester',
      password: 'Password123',
    });
    expect(registered).toMatchObject({
      onboardingStatus: 'PENDING_INTERESTS',
      onboardingCompleted: false,
    });

    const google = await authApi.verifyGoogleIdToken('mock-google-id-token');
    expect(google).toMatchObject({
      mode: 'LOGIN_SUCCESS',
      authSession: { onboardingStatus: 'COMPLETED' },
    });
  });

  it('exposes canonical onboarding recommendation snapshots', async () => {
    const users = await onboardingApi.recommendedUsers();
    expect(users.submittable).toBe(true);
    expect(users.list[0]).toHaveProperty('card.userId');

    const communities = await onboardingApi.recommendedCommunities();
    expect(communities.submittable).toBe(true);
    expect(communities.list[0]).toHaveProperty('card.communityId');

    await expect(onboardingApi.complete()).resolves.toEqual({ onboardingStatus: 'COMPLETED' });
  });
});
