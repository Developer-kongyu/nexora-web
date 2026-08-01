import { http } from 'msw';
import { communitiesApi } from '@/domains/communities';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';

describe('communitiesApi management contract', () => {
  it('creates a community with the canonical profile, policy, tag, rule, and media-key fields', async () => {
    let capturedBody: unknown;
    let idempotencyKey: string | null = null;
    server.use(
      http.post('/api/communities', async ({ request }) => {
        capturedBody = await request.json();
        idempotencyKey = request.headers.get('idempotency-key');
        return apiSuccessResponse({
          communityId: 'community-1',
          slug: 'product-builders',
          ownerUserId: 'user-current',
          rulesVersion: 1,
          settingsVersion: 1,
        });
      }),
    );

    const input = {
      slug: 'product-builders',
      name: '产品构建者',
      description: '讨论产品、设计与工程协作。',
      avatarKey: 'community/avatar/key',
      coverKey: 'community/cover/key',
      categoryKey: 'product',
      tags: ['产品', '设计', '工程'],
      locale: 'zh-CN',
      regionCode: 'TW',
      joinPolicy: 'APPROVAL' as const,
      postRoleMin: 'MEMBER' as const,
      commentRoleMin: 'VISITOR' as const,
      quoteEnabled: true,
      repostEnabled: false,
      requireRuleAcceptanceBeforePost: true,
      rules: ['尊重其他成员', '禁止垃圾信息'],
    };
    const result = await communitiesApi.create(input);

    expect(capturedBody).toEqual(input);
    expect(idempotencyKey).toMatch(/^create-community:/);
    expect(result).toEqual({
      communityId: 'community-1',
      slug: 'product-builders',
      ownerUserId: 'user-current',
      rulesVersion: 1,
      settingsVersion: 1,
    });
  });

  it('uses the public members route with canonical page and role query fields', async () => {
    let capturedUrl = '';
    server.use(
      http.get('/api/communities/:communityId/members', ({ request }) => {
        capturedUrl = request.url;
        return apiSuccessResponse({ list: [], total: 0, page: 2, pageSize: 10 });
      }),
    );

    const result = await communitiesApi.listMembers('community / 1', {
      page: 2,
      pageSize: 10,
      role: 'MODERATOR',
    });

    const url = new URL(capturedUrl);
    expect(url.pathname).toBe('/api/communities/community%20%2F%201/members');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      pageSize: '10',
      role: 'MODERATOR',
    });
    expect(result).toEqual({ list: [], total: 0, page: 2, pageSize: 10 });
  });

  it('sends join-request approval to the dedicated approve route', async () => {
    let capturedBody: unknown;
    let idempotencyKey: string | null = null;
    server.use(
      http.post(
        '/api/communities/:communityId/manage/join-requests/:joinRequestId/approve',
        async ({ request }) => {
          capturedBody = await request.json();
          idempotencyKey = request.headers.get('idempotency-key');
          return apiSuccessResponse({
            communityId: 'c-1',
            joinRequestId: 'request-1',
            applicantUserId: 'u-1',
            result: 'APPROVED_AND_MEMBERSHIP_ACTIVATED' as const,
          });
        },
      ),
    );

    const result = await communitiesApi.approveJoinRequest('c-1', 'request-1', '资料符合规则');

    expect(capturedBody).toEqual({ decisionMessage: '资料符合规则' });
    expect(idempotencyKey).toMatch(/^approve-community-join-request:/);
    expect(result.result).toBe('APPROVED_AND_MEMBERSHIP_ACTIVATED');
  });

  it('leaves through the current-user membership resource instead of a join alias', async () => {
    let capturedMethod = '';
    server.use(
      http.delete('/api/communities/:communityId/members/me', ({ request }) => {
        capturedMethod = request.method;
        return apiSuccessResponse({ communityId: 'c-1', result: 'LEFT' as const });
      }),
    );

    const result = await communitiesApi.leave('c-1');

    expect(capturedMethod).toBe('DELETE');
    expect(result).toEqual({ communityId: 'c-1', result: 'LEFT' });
  });

  it('patches only the seven supported community setting fields', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch('/api/communities/:communityId/settings', async ({ request }) => {
        capturedBody = await request.json();
        return apiSuccessResponse({
          communityId: 'c-1',
          settingsVersion: 8,
          updatedAtIso: '2026-07-28T10:00:00.000Z',
        });
      }),
    );

    const result = await communitiesApi.updateSettings('c-1', {
      visibility: 'PRIVATE',
      joinPolicy: 'INVITE_ONLY',
      postRoleMin: 'MODERATOR',
      commentRoleMin: 'MEMBER',
      quoteEnabled: false,
      repostEnabled: true,
      requireRuleAcceptanceBeforePost: true,
    });

    expect(capturedBody).toEqual({
      visibility: 'PRIVATE',
      joinPolicy: 'INVITE_ONLY',
      postRoleMin: 'MODERATOR',
      commentRoleMin: 'MEMBER',
      quoteEnabled: false,
      repostEnabled: true,
      requireRuleAcceptanceBeforePost: true,
    });
    expect(result.settingsVersion).toBe(8);
  });

  it('uses distinct pin, reorder, and unpin routes and payloads', async () => {
    const calls: Array<{ method: string; pathname: string; body: unknown }> = [];
    server.use(
      http.post('/api/communities/:communityId/manage/pinned-posts', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.json(),
        });
        return apiSuccessResponse({
          communityId: 'c-1',
          postId: 'post-2',
          pinType: 'ANNOUNCEMENT' as const,
          sortOrder: 2,
          result: 'PINNED' as const,
        });
      }),
      http.patch(
        '/api/communities/:communityId/manage/pinned-posts/:postId/order',
        async ({ request }) => {
          calls.push({
            method: request.method,
            pathname: new URL(request.url).pathname,
            body: await request.json(),
          });
          return apiSuccessResponse({
            communityId: 'c-1',
            postId: 'post-2',
            sortOrder: 1,
            swappedWithPostId: 'post-1',
          });
        },
      ),
      http.delete(
        '/api/communities/:communityId/manage/pinned-posts/:postId',
        async ({ request }) => {
          calls.push({
            method: request.method,
            pathname: new URL(request.url).pathname,
            body: await request.json(),
          });
          return apiSuccessResponse({
            communityId: 'c-1',
            postId: 'post-2',
            result: 'UNPINNED' as const,
          });
        },
      ),
    );

    await communitiesApi.pinPost('c-1', {
      postId: 'post-2',
      pinType: 'ANNOUNCEMENT',
      sortOrder: 2,
      reason: '本周公告',
    });
    await communitiesApi.reorderPinnedPost('c-1', 'post-2', 1, '调整顺序');
    await communitiesApi.unpinPost('c-1', 'post-2', '公告结束');

    expect(calls).toEqual([
      {
        method: 'POST',
        pathname: '/api/communities/c-1/manage/pinned-posts',
        body: {
          postId: 'post-2',
          pinType: 'ANNOUNCEMENT',
          sortOrder: 2,
          reason: '本周公告',
        },
      },
      {
        method: 'PATCH',
        pathname: '/api/communities/c-1/manage/pinned-posts/post-2/order',
        body: { targetSortOrder: 1, reason: '调整顺序' },
      },
      {
        method: 'DELETE',
        pathname: '/api/communities/c-1/manage/pinned-posts/post-2',
        body: { reason: '公告结束' },
      },
    ]);
  });
});
