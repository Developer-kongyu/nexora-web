import { fixtureState } from './fixtures.state';

function createAuthState() {
  function mockAuthSession(
    onboardingStatus:
      | 'PENDING_INTERESTS'
      | 'PENDING_RECOMMENDED_USERS'
      | 'PENDING_RECOMMENDED_COMMUNITIES'
      | 'PENDING_COMPLETE'
      | 'COMPLETED' = 'COMPLETED',
    authMethod: 'PASSWORD' | 'PHONE_CODE' | 'GOOGLE_ID_TOKEN' = 'PASSWORD',
  ) {
    return {
      userId: fixtureState.currentUser.id,
      accessToken: 'mock-access-token',
      accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      refreshTokenExpiresAt: '2030-02-01T00:00:00.000Z',
      csrfToken: 'mock-csrf-token',
      session: {
        sessionId: 'mock-session-id',
        authMethod,
        deviceName: null,
        lastSeenAt: '2026-07-28T00:00:00.000Z',
        expiresAt: '2030-02-01T00:00:00.000Z',
      },
      onboardingStatus,
    };
  }

  let mockHandle = fixtureState.currentUser.handle;

  let mockEmailValue: string | null = 'mock-user@example.test';

  let mockEmailVerifiedAt: string | null = null;

  let mockPhone: {
    value: string;
    isLoginEnabled: boolean;
    verifiedAt: string;
  } | null = null;

  let mockSessions = [
    {
      sessionId: 'mock-session-id',
      authMethod: 'PASSWORD' as const,
      deviceName: null,
      deviceFamily: 'desktop',
      browserName: 'Mock Browser',
      osName: 'Mock OS',
      lastActiveOrCreatedAtIso: '2026-08-09T01:00:00.000Z',
      createdAtIso: '2026-08-09T01:00:00.000Z',
      expiresAtIso: '2030-02-01T00:00:00.000Z',
      isCurrent: true,
      effectiveStatus: 'ACTIVE' as const,
    },
  ];
  return {
    mockAuthSession,
    get mockHandle() {
      return mockHandle;
    },
    set mockHandle(value: typeof mockHandle) {
      mockHandle = value;
    },
    get mockEmailValue() {
      return mockEmailValue;
    },
    set mockEmailValue(value: typeof mockEmailValue) {
      mockEmailValue = value;
    },
    get mockEmailVerifiedAt() {
      return mockEmailVerifiedAt;
    },
    set mockEmailVerifiedAt(value: typeof mockEmailVerifiedAt) {
      mockEmailVerifiedAt = value;
    },
    get mockPhone() {
      return mockPhone;
    },
    set mockPhone(value: typeof mockPhone) {
      mockPhone = value;
    },
    get mockSessions() {
      return mockSessions;
    },
    set mockSessions(value: typeof mockSessions) {
      mockSessions = value;
    },
  };
}

export let authState = createAuthState();

export function resetAuthState(): void {
  authState = createAuthState();
}
