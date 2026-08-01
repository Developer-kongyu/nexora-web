import { afterEach, describe, expect, it, vi } from 'vitest';
import { authSession, type AuthRefreshContext } from './authSession';

afterEach(() => {
  authSession.clear();
  authSession.configureRefresh(() => Promise.resolve(null));
});

describe('authSession', () => {
  it('coalesces concurrent refresh requests into one handler call', async () => {
    let resolveRefresh: ((token: string | null) => void) | undefined;
    const refreshHandler = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    authSession.configureRefresh(refreshHandler);

    const first = authSession.refresh();
    const second = authSession.refresh();

    expect(refreshHandler).toHaveBeenCalledTimes(1);
    resolveRefresh?.('fresh-token');
    await expect(Promise.all([first, second])).resolves.toEqual([
      'fresh-token',
      'fresh-token',
    ]);
  });

  it('releases a failed in-flight refresh so the next request can retry', async () => {
    let attempt = 0;
    const refreshHandler = vi.fn((): Promise<string | null> => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new Error('temporary failure'))
        : Promise.resolve('recovered-token');
    });
    authSession.configureRefresh(refreshHandler);

    await expect(authSession.refresh()).rejects.toThrow('temporary failure');
    await expect(authSession.refresh()).resolves.toBe('recovered-token');
    expect(refreshHandler).toHaveBeenCalledTimes(2);
  });

  it('invalidates an in-flight refresh when the local session is cleared', async () => {
    let resolveRefresh: ((token: string | null) => void) | undefined;
    let committedToken: string | null = null;
    const refreshHandler = vi.fn(
      ({ isCurrent }: AuthRefreshContext) =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = (token) => {
            if (isCurrent()) committedToken = token;
            resolve(token);
          };
        }),
    );
    authSession.configureRefresh(refreshHandler);

    const pending = authSession.refresh();
    authSession.clear();
    resolveRefresh?.('stale-token');

    await expect(pending).resolves.toBeNull();
    expect(committedToken).toBeNull();
    expect(authSession.getAccessToken()).toBeNull();
    await expect(authSession.refresh()).resolves.toBeNull();
    expect(refreshHandler).toHaveBeenCalledTimes(1);
  });

  it('does not let a stale finalizer clear a newer single-flight refresh', async () => {
    let resolveFirst: ((token: string | null) => void) | undefined;
    let resolveSecond: ((token: string | null) => void) | undefined;
    const firstHandler = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const secondHandler = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveSecond = resolve;
        }),
    );

    authSession.configureRefresh(firstHandler);
    const stale = authSession.refresh();
    authSession.clear();
    authSession.configureRefresh(secondHandler);
    const current = authSession.refresh();

    resolveFirst?.('stale-token');
    await expect(stale).resolves.toBeNull();

    const joinedCurrent = authSession.refresh();
    expect(secondHandler).toHaveBeenCalledTimes(1);
    resolveSecond?.('current-token');
    await expect(Promise.all([current, joinedCurrent])).resolves.toEqual([
      'current-token',
      'current-token',
    ]);
  });

  it('invalidates an in-flight refresh when its handler is unconfigured', async () => {
    let resolveRefresh: ((token: string | null) => void) | undefined;
    const refreshHandler = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    authSession.configureRefresh(refreshHandler);

    const pending = authSession.refresh();
    authSession.unconfigureRefresh(refreshHandler);
    resolveRefresh?.('stale-token');

    await expect(pending).resolves.toBeNull();
    await expect(authSession.refresh()).resolves.toBeNull();
  });

  it('does not let a stale provider cleanup remove a newer refresh handler', async () => {
    const firstHandler = vi.fn(() => Promise.resolve('first-token'));
    const secondHandler = vi.fn(() => Promise.resolve('second-token'));

    authSession.configureRefresh(firstHandler);
    authSession.configureRefresh(secondHandler);
    authSession.unconfigureRefresh(firstHandler);

    await expect(authSession.refresh()).resolves.toBe('second-token');
    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('invalidates an in-flight refresh when its handler is replaced', async () => {
    let resolveFirst: ((token: string | null) => void) | undefined;
    let firstCommitAllowed = false;
    const firstHandler = vi.fn(
      ({ isCurrent }: AuthRefreshContext) =>
        new Promise<string | null>((resolve) => {
          resolveFirst = (token) => {
            firstCommitAllowed = isCurrent();
            resolve(token);
          };
        }),
    );
    const secondHandler = vi.fn(() => Promise.resolve('current-token'));

    authSession.configureRefresh(firstHandler);
    const stale = authSession.refresh();
    authSession.configureRefresh(secondHandler);
    resolveFirst?.('stale-token');

    await expect(stale).resolves.toBeNull();
    expect(firstCommitAllowed).toBe(false);
    await expect(authSession.refresh()).resolves.toBe('current-token');
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('invalidates refresh without dropping the bearer token needed by logout', async () => {
    authSession.setAccessToken('active-token');
    const refreshHandler = vi.fn(() => Promise.resolve('unexpected-token'));
    authSession.configureRefresh(refreshHandler);

    authSession.invalidateRefresh();

    expect(authSession.getAccessToken()).toBe('active-token');
    await expect(authSession.refresh()).resolves.toBeNull();
    expect(refreshHandler).not.toHaveBeenCalled();
  });
});
