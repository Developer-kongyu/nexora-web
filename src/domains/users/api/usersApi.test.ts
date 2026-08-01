import { http } from 'msw';
import { server } from '@/mocks/server';
import { usersApi, type UpdateOwnProfileRequest } from './usersApi';
import { apiSuccessResponse } from '@/test/http';

const editableProfile = {
  userId: 'user-current',
  displayName: '林知夏',
  bio: '产品设计师',
  location: '上海',
  websiteUrl: 'https://lct.design',
  birthday: '1995-04-18',
  avatarStorageKey: 'users/avatar/current',
  coverStorageKey: null,
  avatarUrl: '/media/city.svg',
  coverUrl: null,
  avatarMediaState: 'READY' as const,
  coverMediaState: 'MISSING' as const,
  updatedAt: '2026-07-28T08:00:00.000Z',
};

describe('usersApi editable profile contract', () => {
  it('loads the owner-only editable profile resource', async () => {
    let method = '';
    server.use(
      http.get('/api/users/me/profile', ({ request }) => {
        method = request.method;
        return apiSuccessResponse(editableProfile);
      }),
    );

    const result = await usersApi.getOwnEditableProfile();

    expect(method).toBe('GET');
    expect(result).toEqual(editableProfile);
  });

  it('forwards only the canonical profile patch fields without legacy aliases', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch('/api/users/me/profile', async ({ request }) => {
        capturedBody = await request.json();
        return apiSuccessResponse({
          ...editableProfile,
          displayName: '林知夏 · 产品设计',
          coverStorageKey: 'users/cover/current',
          coverUrl: '/media/coast.svg',
          coverMediaState: 'READY' as const,
        });
      }),
    );

    const input: UpdateOwnProfileRequest = {
      displayName: '林知夏 · 产品设计',
      bio: null,
      location: '台北',
      websiteUrl: 'https://example.com/profile',
      birthday: null,
      avatarStorageKey: null,
      coverStorageKey: 'users/cover/current',
    };
    const result = await usersApi.updateOwnProfile(input);

    expect(capturedBody).toEqual(input);
    expect(capturedBody).not.toHaveProperty('website');
    expect(capturedBody).not.toHaveProperty('occupation');
    expect(capturedBody).not.toHaveProperty('avatarAssetId');
    expect(capturedBody).not.toHaveProperty('coverAssetId');
    expect(result.coverStorageKey).toBe('users/cover/current');
  });
});

const relationSnapshot = {
  viewerUserId: 'user-current',
  targetUserId: 'u-1',
  isSelf: false,
  following: true,
  followedBy: false,
  outgoingFollowRequestPending: false,
  incomingFollowRequestPending: false,
  mutePosts: false,
  muteNotifications: false,
  blockedByViewer: false,
  blockedByTarget: false,
  summary: 'FOLLOWING' as const,
};

const relationListItem = {
  userId: 'u-1',
  handle: 'product_builder',
  displayName: '产品构建者',
  bio: '产品、设计与工程',
  avatarUrl: null,
  relationship: relationSnapshot,
  followedAt: '2026-07-28T08:00:00.000Z',
  followRequestId: null,
  muted: null,
  blocked: false,
};

describe('usersApi relationship list contract', () => {
  it('uses the canonical followers cursor query and keeps the server DTO unchanged', async () => {
    let capturedUrl = '';
    server.use(
      http.get('/api/users/:handle/followers', ({ request }) => {
        capturedUrl = request.url;
        return apiSuccessResponse({ list: [relationListItem], nextCursor: 'next-cursor' });
      }),
    );

    const result = await usersApi.followers('name / 中文', 'cursor / 1', 7);
    const url = new URL(capturedUrl);

    expect(url.pathname).toBe('/api/users/name%20%2F%20%E4%B8%AD%E6%96%87/followers');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '7',
      cursor: 'cursor / 1',
    });
    expect(result).toEqual({ list: [relationListItem], nextCursor: 'next-cursor' });
    expect(result).not.toHaveProperty('hasMore');
  });

  it('reads muted and blocked management lists from the owner-only routes', async () => {
    const paths: string[] = [];
    server.use(
      http.get('/api/users/me/mutes', ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return apiSuccessResponse({
          list: [
            {
              ...relationListItem,
              cardState: 'FULL' as const,
              placeholderReason: null,
              followedAt: null,
              muted: { mutePosts: true, muteNotifications: false },
            },
          ],
          nextCursor: null,
        });
      }),
      http.get('/api/users/me/blocks', ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return apiSuccessResponse({
          list: [
            {
              ...relationListItem,
              cardState: 'FULL' as const,
              placeholderReason: null,
              followedAt: null,
              blocked: true,
              canUnblock: true,
            },
          ],
          nextCursor: null,
        });
      }),
    );

    const [muted, blocked] = await Promise.all([
      usersApi.mutedUsers(undefined, 20),
      usersApi.blockedUsers(undefined, 20),
    ]);

    expect(paths).toEqual(['/api/users/me/mutes', '/api/users/me/blocks']);
    expect(muted.list[0]?.muted).toEqual({ mutePosts: true, muteNotifications: false });
    expect(blocked.list[0]?.canUnblock).toBe(true);
  });

  it('uses DELETE on the dedicated mute and block resources and preserves actionResult', async () => {
    const calls: Array<{ method: string; pathname: string }> = [];
    server.use(
      http.delete('/api/users/:handle/mute', ({ request }) => {
        calls.push({ method: request.method, pathname: new URL(request.url).pathname });
        return apiSuccessResponse({
          targetUserId: 'u-1',
          actionResult: 'DELETED' as const,
          targetState: 'FOUND' as const,
          relationship: {
            ...relationSnapshot,
            targetUserId: 'u-1',
            mutePosts: false,
            muteNotifications: false,
          },
        });
      }),
      http.delete('/api/users/:handle/block', ({ request }) => {
        calls.push({ method: request.method, pathname: new URL(request.url).pathname });
        return apiSuccessResponse({
          targetUserId: 'u-1',
          actionResult: 'NOOP_NOT_FOUND' as const,
          targetState: 'FOUND' as const,
          relationship: {
            ...relationSnapshot,
            targetUserId: 'u-1',
            blockedByViewer: false,
          },
        });
      }),
    );

    const [unmuted, unblocked] = await Promise.all([
      usersApi.unmute('quiet / user'),
      usersApi.unblock('blocked / user'),
    ]);

    expect(calls).toEqual([
      { method: 'DELETE', pathname: '/api/users/quiet%20%2F%20user/mute' },
      { method: 'DELETE', pathname: '/api/users/blocked%20%2F%20user/block' },
    ]);
    expect(unmuted.actionResult).toBe('DELETED');
    expect(unblocked.actionResult).toBe('NOOP_NOT_FOUND');
  });

  it('keeps route resolution failures distinct from post-commit degraded success', async () => {
    await expect(usersApi.follow('missing_relation_target')).rejects.toMatchObject({
      httpStatus: 404,
      code: 'USER_RELATION_TARGET_NOT_FOUND',
    });
  });
});
