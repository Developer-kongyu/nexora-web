import { describe, expect, it } from 'vitest';
import { authApi, onboardingApi } from '@/domains/auth';

describe('authApi default MSW contract', () => {
  it('uses the canonical password, phone-code, email-registration, and phone-registration routes', async () => {
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
      mode: 'email',
      email: 'tester@example.com',
      handle: 'tester',
      password: 'Password123',
    });
    expect(registered).toMatchObject({
      onboardingStatus: 'PENDING_INTERESTS',
      onboardingCompleted: false,
    });

    const registrationCode = await authApi.requestPhoneRegistrationCode({
      phone: '+8613900139000',
    });
    expect(registrationCode).toMatchObject({
      accepted: true,
      retryAfterSeconds: 60,
    });

    const phoneRegistered = await authApi.register({
      mode: 'phone',
      phone: '+8613900139000',
      code: '123456',
      handle: 'phone_tester',
      password: 'Password123',
    });
    expect(phoneRegistered).toMatchObject({
      onboardingStatus: 'PENDING_INTERESTS',
      onboardingCompleted: false,
      user: { handle: 'phone_tester' },
    });

    const google = await authApi.verifyGoogleIdToken('mock-google-id-token');
    expect(google).toMatchObject({
      mode: 'LOGIN_SUCCESS',
      authSession: { onboardingStatus: 'COMPLETED' },
    });
  });

  it('reads account security and supports email verification plus phone binding', async () => {
    const account = await authApi.accountSecurity();
    expect(account).toMatchObject({
      userId: 'user-current',
      status: 'ACTIVE',
      handle: 'zhiqiu',
      email: {
        value: 'mock-user@example.test',
        verifiedAt: null,
      },
      phone: null,
      password: { configured: true },
    });

    const sessions = await authApi.sessions();
    expect(sessions).toMatchObject({
      total: 1,
      list: [{ sessionId: 'mock-session-id', isCurrent: true }],
    });

    await expect(authApi.requestEmailVerification()).resolves.toMatchObject({
      accepted: true,
    });
    await expect(authApi.confirmEmailVerification('mock-email-token')).resolves.toMatchObject({
      verified: true,
      userId: 'user-current',
    });

    const verified = await authApi.accountSecurity();
    expect(verified.email?.verifiedAt).not.toBeNull();

    const firstPhone = '+8613800138000';
    await expect(
      authApi.requestPhoneIdentityVerification({
        phone: firstPhone,
        purpose: 'BIND_PHONE_VERIFY',
      }),
    ).resolves.toMatchObject({ accepted: true });
    await expect(
      authApi.bindPhone({ phone: firstPhone, verificationCode: '123456' }),
    ).resolves.toMatchObject({
      phone: firstPhone,
      isPrimary: false,
    });

    const bound = await authApi.accountSecurity();
    expect(bound.phone).toMatchObject({
      value: firstPhone,
      isLoginEnabled: true,
    });

    const replacementPhone = '+8613900139000';
    await expect(
      authApi.requestPhoneIdentityVerification({
        phone: replacementPhone,
        purpose: 'CHANGE_PRIMARY_PHONE_VERIFY',
      }),
    ).resolves.toMatchObject({ accepted: true });
    await expect(
      authApi.changePrimaryPhone({
        phone: replacementPhone,
        verificationCode: '654321',
      }),
    ).resolves.toMatchObject({
      phone: replacementPhone,
      isPrimary: true,
    });

    const changed = await authApi.accountSecurity();
    expect(changed.phone?.value).toBe(replacementPhone);
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
