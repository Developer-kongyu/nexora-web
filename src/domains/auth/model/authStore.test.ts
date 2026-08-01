import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserSummary } from '@/domains/users';
import { authSession, type AuthRefreshContext } from '@/shared/api/authSession';
import { useAuthStore } from './authStore';

const refreshedUser: UserSummary = {
  id: 'user-refreshed',
  handle: 'refreshed',
  displayName: '刷新用户',
  avatarUrl: null,
};

const signedInUser: UserSummary = {
  id: 'user-signed-in',
  handle: 'signed-in',
  displayName: '登录用户',
  avatarUrl: null,
};

afterEach(() => {
  useAuthStore.getState().setAnonymous();
});

describe('authStore session commits', () => {
  it('keeps the current refresh generation active when committing its result', async () => {
    const refreshHandler = vi.fn(({ isCurrent }: AuthRefreshContext) => {
      expect(isCurrent()).toBe(true);
      useAuthStore
        .getState()
        .setRefreshedSession('refreshed-token', refreshedUser, true);
      expect(isCurrent()).toBe(true);
      return Promise.resolve('refreshed-token');
    });
    authSession.configureRefresh(refreshHandler);

    await expect(authSession.refresh()).resolves.toBe('refreshed-token');
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: refreshedUser,
      onboardingCompleted: true,
    });
    expect(authSession.getAccessToken()).toBe('refreshed-token');
  });

  it('invalidates an older refresh when an interactive sign-in commits a session', async () => {
    let resolveRefresh: (() => void) | undefined;
    let staleCommitAttempted = false;
    const refreshHandler = vi.fn(
      ({ isCurrent }: AuthRefreshContext) =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = () => {
            if (isCurrent()) {
              staleCommitAttempted = true;
              useAuthStore
                .getState()
                .setRefreshedSession('stale-token', refreshedUser, false);
            }
            resolve('stale-token');
          };
        }),
    );
    authSession.configureRefresh(refreshHandler);
    const staleRefresh = authSession.refresh();

    useAuthStore.getState().setSession('signed-in-token', signedInUser, true);
    resolveRefresh?.();

    await expect(staleRefresh).resolves.toBeNull();
    expect(staleCommitAttempted).toBe(false);
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: signedInUser,
      onboardingCompleted: true,
    });
    expect(authSession.getAccessToken()).toBe('signed-in-token');
  });
});
