import { cleanup, render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/domains/auth';
import { server } from '@/mocks/server';
import { authSession } from '@/shared/api/authSession';
import { apiSuccessResponse } from '@/test/http';
import { AuthBootstrap } from './AuthBootstrap';

const refreshedSession = {
  userId: 'user-bootstrap-current',
  accessToken: 'bootstrap-access-token',
  accessTokenExpiresAt: '2026-08-03T09:00:00.000Z',
  refreshTokenExpiresAt: '2026-08-10T09:00:00.000Z',
  csrfToken: 'bootstrap-csrf-token',
  session: {
    sessionId: 'session-bootstrap-current',
    authMethod: 'PASSWORD' as const,
    deviceName: 'Bootstrap Test',
    lastSeenAt: '2026-08-03T08:00:00.000Z',
    expiresAt: '2026-08-10T09:00:00.000Z',
  },
  onboardingStatus: 'COMPLETED' as const,
};

function renderBootstrap(): void {
  render(
    <AuthBootstrap>
      <span>application</span>
    </AuthBootstrap>,
  );
}

beforeEach(() => {
  authSession.clear();
  useAuthStore.setState({
    status: 'bootstrapping',
    user: null,
    onboardingCompleted: false,
    onboardingStatus: null,
  });
});

afterEach(() => {
  cleanup();
  useAuthStore.getState().setAnonymous();
});

describe('AuthBootstrap current-user hydration', () => {
  it('commits the refreshed token before loading and applying the authoritative user card', async () => {
    let authorization: string | null = null;
    server.use(
      http.post('/api/auth/refresh', () => apiSuccessResponse(refreshedSession)),
      http.get('/api/users/me', ({ request }) => {
        authorization = request.headers.get('authorization');
        return apiSuccessResponse({
          userId: refreshedSession.userId,
          handle: 'authoritative.user',
          displayName: '权威当前用户',
          avatarUrl: 'https://cdn.example.test/current-avatar.png',
        });
      }),
    );

    renderBootstrap();

    await waitFor(() =>
      expect(useAuthStore.getState()).toMatchObject({
        status: 'authenticated',
        user: {
          id: refreshedSession.userId,
          handle: 'authoritative.user',
          displayName: '权威当前用户',
          avatarUrl: 'https://cdn.example.test/current-avatar.png',
        },
        onboardingCompleted: true,
        onboardingStatus: 'COMPLETED',
      }),
    );
    expect(authorization).toBe(`Bearer ${refreshedSession.accessToken}`);
    expect(authSession.getAccessToken()).toBe(refreshedSession.accessToken);
    expect(authSession.getCsrfToken()).toBe(refreshedSession.csrfToken);
  });

  it('keeps a successfully refreshed session authenticated when current-user hydration is 503', async () => {
    let currentCardCalls = 0;
    server.use(
      http.post('/api/auth/refresh', () => apiSuccessResponse(refreshedSession)),
      http.get('/api/users/me', () => {
        currentCardCalls += 1;
        return HttpResponse.json(
          {
            code: 'USER_PROFILE_TEMPORARILY_UNAVAILABLE',
            message: '用户资料暂时不可用',
          },
          { status: 503 },
        );
      }),
    );

    renderBootstrap();

    await waitFor(() => expect(currentCardCalls).toBe(1));
    await waitFor(() =>
      expect(useAuthStore.getState()).toMatchObject({
        status: 'authenticated',
        user: {
          id: refreshedSession.userId,
          handle: '',
          displayName: '用户',
          avatarUrl: null,
        },
      }),
    );
    expect(authSession.getAccessToken()).toBe(refreshedSession.accessToken);
  });

  it('invalidates authentication when current-user hydration returns 401 without recursive refresh', async () => {
    let refreshCalls = 0;
    let currentCardCalls = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        return apiSuccessResponse(refreshedSession);
      }),
      http.get('/api/users/me', () => {
        currentCardCalls += 1;
        return HttpResponse.json(
          { code: 'AUTH_ACCESS_TOKEN_INVALID', message: '访问凭证无效' },
          { status: 401 },
        );
      }),
    );

    renderBootstrap();

    await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'));
    expect(refreshCalls).toBe(1);
    expect(currentCardCalls).toBe(1);
    expect(authSession.getAccessToken()).toBeNull();
  });

  it('sets anonymous on refresh failure and never requests the current-user card', async () => {
    let currentCardCalls = 0;
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json(
          { code: 'AUTH_REFRESH_TOKEN_INVALID', message: '刷新凭证无效' },
          { status: 401 },
        ),
      ),
      http.get('/api/users/me', () => {
        currentCardCalls += 1;
        return apiSuccessResponse({
          userId: refreshedSession.userId,
          handle: 'must.not.load',
          displayName: 'Must Not Load',
          avatarUrl: null,
        });
      }),
    );

    renderBootstrap();

    await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'));
    expect(currentCardCalls).toBe(0);
    expect(authSession.getAccessToken()).toBeNull();
  });
});
