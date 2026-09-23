import { http, delay } from 'msw';
import { ok } from './http';
import { authState } from '../state/auth.state';
import { fixtureState } from '../state/fixtures.state';
import { communitiesState } from '../state/communities.state';

export const authHandlers = [
  http.post('/api/auth/refresh', async () => {
    await delay(120);
    return ok(authState.mockAuthSession());
  }),
  http.post('/api/auth/login/password', async () => {
    await delay(250);
    return ok(authState.mockAuthSession());
  }),
  http.post('/api/auth/login/code/request', async () => {
    await delay(160);
    return ok({ requested: true as const, expiresInSeconds: 600 });
  }),
  http.post('/api/auth/login/code/confirm', async () => {
    await delay(220);
    return ok(authState.mockAuthSession('COMPLETED', 'PHONE_CODE'));
  }),
  http.post('/api/auth/register/email', async () => {
    await delay(260);
    return ok(authState.mockAuthSession('PENDING_INTERESTS'));
  }),
  http.post('/api/auth/verification/phone/request', async () => {
    await delay(160);
    return ok({
      accepted: true as const,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }),
  http.post('/api/auth/register/phone', async () => {
    await delay(260);
    return ok(authState.mockAuthSession('PENDING_INTERESTS', 'PHONE_CODE'));
  }),
  http.post('/api/auth/password/reset/request', async () => {
    await delay(160);
    return ok({ requested: true as const });
  }),
  http.post('/api/auth/password/reset/confirm', async () => {
    await delay(220);
    return ok({ reset: true as const, userId: fixtureState.currentUser.id, securityVersion: 2 });
  }),
  http.get('/api/auth/account/security', () =>
    ok({
      userId: fixtureState.currentUser.id,
      status: 'ACTIVE' as const,
      handle: authState.mockHandle,
      email: authState.mockEmailValue
        ? {
            value: authState.mockEmailValue,
            isLoginEnabled: true,
            verifiedAt: authState.mockEmailVerifiedAt,
          }
        : null,
      phone: authState.mockPhone,
      password: {
        configured: true,
        setAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    }),
  ),
  http.get('/api/auth/sessions', () =>
    ok({
      list: authState.mockSessions,
      total: authState.mockSessions.length,
      page: 1,
      pageSize: 100,
    }),
  ),
  http.delete('/api/auth/sessions/:sessionId', ({ params }) => {
    const sessionId = String(params.sessionId);
    authState.mockSessions = authState.mockSessions.filter(
      (session) => session.sessionId !== sessionId,
    );
    return ok({ revoked: true as const, sessionId });
  }),
  http.patch('/api/auth/identities/handle', async ({ request }) => {
    const body = (await request.json()) as { newHandle: string };
    authState.mockHandle = body.newHandle;
    return ok({
      result: 'CHANGED' as const,
      userId: fixtureState.currentUser.id,
      handle: authState.mockHandle,
      profileVersion: 2,
    });
  }),
  http.post('/api/auth/verification/email/request', () =>
    ok({
      accepted: true as const,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }),
  ),
  http.post('/api/auth/verification/email/confirm', () => {
    authState.mockEmailVerifiedAt = new Date().toISOString();
    return ok({
      verified: true as const,
      userId: fixtureState.currentUser.id,
      identityId: 'mock-email-identity',
    });
  }),
  http.post('/api/auth/identities/email/change-primary', async ({ request }) => {
    const body = (await request.json()) as { email: string; verificationToken: string };
    const verifiedAtIso = new Date().toISOString();
    authState.mockEmailValue = body.email;
    authState.mockEmailVerifiedAt = verifiedAtIso;
    return ok({
      identityId: 'mock-email-primary-identity',
      email: body.email,
      isPrimary: true,
      verifiedAtIso,
    });
  }),
  http.post('/api/auth/identities/phone/bind', async ({ request }) => {
    const body = (await request.json()) as { phone: string; verificationCode: string };
    const verifiedAtIso = new Date().toISOString();
    authState.mockPhone = {
      value: body.phone,
      isLoginEnabled: true,
      verifiedAt: verifiedAtIso,
    };
    return ok({
      identityId: 'mock-phone-identity',
      phone: body.phone,
      isPrimary: false,
      verifiedAtIso,
    });
  }),
  http.post('/api/auth/identities/phone/change-primary', async ({ request }) => {
    const body = (await request.json()) as { phone: string; verificationCode: string };
    const verifiedAtIso = new Date().toISOString();
    authState.mockPhone = {
      value: body.phone,
      isLoginEnabled: true,
      verifiedAt: verifiedAtIso,
    };
    return ok({
      identityId: 'mock-phone-primary-identity',
      phone: body.phone,
      isPrimary: true,
      verifiedAtIso,
    });
  }),
  http.post('/api/auth/password/change', () =>
    ok({
      changed: true as const,
      userId: fixtureState.currentUser.id,
      securityVersion: 2,
      clientAction: 'RELOGIN_REQUIRED' as const,
    }),
  ),
  http.post('/api/auth/deactivate', () =>
    ok({
      deactivated: true as const,
      userId: fixtureState.currentUser.id,
      clientAction: 'RELOGIN_REQUIRED' as const,
    }),
  ),
  http.post('/api/auth/oauth/google/verify-id-token', async () => {
    await delay(220);
    return ok({ mode: 'LOGIN_SUCCESS' as const, authSession: authState.mockAuthSession() });
  }),
  http.post('/api/auth/oauth/google/complete-profile', async () => {
    await delay(220);
    return ok(authState.mockAuthSession('PENDING_INTERESTS', 'GOOGLE_ID_TOKEN'));
  }),
  http.get('/api/auth/onboarding/status', () =>
    ok({
      userId: fixtureState.currentUser.id,
      onboardingStatus: 'PENDING_INTERESTS' as const,
      completedSteps: [],
      selectedInterestTagCodes: [],
      recommendedUserIds: [],
      recommendedCommunityIds: [],
      lastStep: null,
      nextStep: 'interests' as const,
      recommendationSnapshotVersion: null,
      recommendationSnapshotPayloadHash: null,
    }),
  ),
  http.post('/api/auth/onboarding/interests', () => ok({ saved: true as const })),
  http.get('/api/auth/onboarding/recommendations/users', () =>
    ok({
      list: fixtureState.users.slice(0, 4).map((user, index) => ({
        userId: user.id,
        score: 1 - index * 0.1,
        reasonCode: 'INTEREST_MATCH',
        card: {
          userId: user.id,
          handle: user.handle,
          displayName: user.displayName,
          bio: user.bio ?? null,
          avatarUrl: user.avatarUrl,
          followersCount: user.followersCount ?? 0,
        },
      })),
      snapshotVersion: 1,
      snapshotPayloadHash: 'mock-user-snapshot',
      submitMode: 'SNAPSHOT' as const,
      sourceSubmitToken: null,
      submittable: true,
    }),
  ),
  http.post('/api/auth/onboarding/recommendations/users', () =>
    ok({
      retryRequired: false,
      completedSteps: ['interests', 'recommended-users'],
      lastStep: 'recommended-users' as const,
      nextStep: 'recommended-communities' as const,
    }),
  ),
  http.get('/api/auth/onboarding/recommendations/communities', () =>
    ok({
      list: communitiesState.allCommunitySummaries().map((summary, index) => ({
        communityId: summary.id,
        score: 1 - index * 0.1,
        reasonCode: 'INTEREST_MATCH',
        card: {
          communityId: summary.id,
          slug: summary.slug,
          displayName: summary.name,
          avatarUrl: summary.avatarUrl,
          memberCount: summary.membersCount,
          description: summary.description || null,
        },
        membership: { joined: summary.joined, pending: false },
      })),
      snapshotVersion: 1,
      snapshotPayloadHash: 'mock-community-snapshot',
      submitMode: 'SNAPSHOT' as const,
      sourceSubmitToken: null,
      submittable: true,
    }),
  ),
  http.post('/api/auth/onboarding/recommendations/communities', () =>
    ok({
      retryRequired: false,
      completedSteps: ['interests', 'recommended-users', 'recommended-communities'],
      lastStep: 'recommended-communities' as const,
      nextStep: 'complete' as const,
    }),
  ),
  http.post('/api/auth/onboarding/complete', () => ok({ onboardingStatus: 'COMPLETED' as const })),
  http.post('/api/auth/onboarding/skip', () => ok({ onboardingStatus: 'SKIPPED' as const })),
  http.post('/api/auth/logout', () => ok({ loggedOut: true as const })),
];
