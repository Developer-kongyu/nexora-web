import { http } from 'msw';
import { buildPostComposeInput } from '@/domains/posts/lib/compose';
import { server } from '@/mocks/server';
import { postsApi } from './postsApi';
import { apiSuccessResponse } from '@/test/http';

describe('postsApi draft contract', () => {
  it('lists, deletes, and publishes drafts through the formal B04 routes', async () => {
    const calls: Array<{
      method: string;
      url: string;
      body: unknown;
      idempotencyKey: string | null;
    }> = [];

    server.use(
      http.get('/api/posts/drafts', ({ request }) => {
        calls.push({
          method: request.method,
          url: request.url,
          body: null,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({ list: [], nextCursor: null });
      }),
      http.delete('/api/posts/drafts/:draftId', ({ request, params }) => {
        calls.push({
          method: request.method,
          url: request.url,
          body: null,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({
          draftId: String(params.draftId),
          outcome: 'DELETED_NOW' as const,
        });
      }),
      http.post('/api/posts/drafts/:draftId/publish', async ({ request, params }) => {
        calls.push({
          method: request.method,
          url: request.url,
          body: await request.json(),
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({
          postId: 'post-1',
          draftId: String(params.draftId),
          publishState: 'PUBLISHED' as const,
          publishMode: 'IMMEDIATE' as const,
          pendingMediaAssetIds: [],
        });
      }),
    );

    await postsApi.drafts({ cursor: 'draft / cursor', limit: 17 });
    await postsApi.deleteDraft('draft / 1');
    await postsApi.publishDraft(
      'draft / 1',
      { allowWaitingMediaPublish: true },
      'publish-draft-fixed',
    );

    expect(
      calls.map(({ method, url, body, idempotencyKey }) => {
        const parsed = new URL(url);
        return {
          method,
          pathname: parsed.pathname,
          query: Object.fromEntries(parsed.searchParams),
          body,
          idempotencyKey,
        };
      }),
    ).toEqual([
      {
        method: 'GET',
        pathname: '/api/posts/drafts',
        query: { cursor: 'draft / cursor', limit: '17' },
        body: null,
        idempotencyKey: null,
      },
      {
        method: 'DELETE',
        pathname: '/api/posts/drafts/draft%20%2F%201',
        query: {},
        body: null,
        idempotencyKey: null,
      },
      {
        method: 'POST',
        pathname: '/api/posts/drafts/draft%20%2F%201/publish',
        query: {},
        body: { allowWaitingMediaPublish: true },
        idempotencyKey: 'publish-draft-fixed',
      },
    ]);
  });

  it('creates, reads, autosaves, and manually saves through the versioned draft contract', async () => {
    const calls: Array<{
      method: string;
      pathname: string;
      version: string | null;
      idempotencyKey: string | null;
      body: unknown;
    }> = [];
    const compose = buildPostComposeInput({
      bodyText: '版本化草稿',
      mediaAssetIds: ['media-1'],
      visibility: 'FOLLOWERS',
    });

    server.use(
      http.post('/api/posts/drafts', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          version: request.headers.get('x-post-draft-version'),
          idempotencyKey: request.headers.get('idempotency-key'),
          body: await request.json(),
        });
        return apiSuccessResponse({
          draftId: 'draft-1',
          draftVersion: 1,
          saved: true as const,
          created: true as const,
          bodyTextPreview: '版本化草稿',
          updatedAtIso: '2026-07-28T00:00:00.000Z',
        });
      }),
      http.get('/api/posts/drafts/:draftId', ({ request, params }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          version: request.headers.get('x-post-draft-version'),
          idempotencyKey: request.headers.get('idempotency-key'),
          body: null,
        });
        return apiSuccessResponse({
          draftId: String(params.draftId),
          draftVersion: 1,
          state: 'EDITABLE' as const,
          composeSnapshot: { ...compose, bodyTextNormalized: compose.bodyText },
          validationDiagnostics: null,
          linkPreviewState: { state: 'NONE' as const, card: null },
          updatedAtIso: '2026-07-28T00:00:00.000Z',
          lastAutosavedAtIso: null,
          lastSavedAtIso: '2026-07-28T00:00:00.000Z',
        });
      }),
      http.put('/api/posts/drafts/:draftId/autosave', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          version: request.headers.get('x-post-draft-version'),
          idempotencyKey: request.headers.get('idempotency-key'),
          body: await request.json(),
        });
        return apiSuccessResponse({
          draftId: 'draft-1',
          draftVersion: 2,
          saved: true,
          reason: 'UPDATED' as const,
          updatedAtIso: '2026-07-28T00:01:00.000Z',
          lastSavedAtIso: '2026-07-28T00:00:00.000Z',
        });
      }),
      http.put('/api/posts/drafts/:draftId', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          version: request.headers.get('x-post-draft-version'),
          idempotencyKey: request.headers.get('idempotency-key'),
          body: await request.json(),
        });
        return apiSuccessResponse({
          draftId: 'draft-1',
          draftVersion: 3,
          saved: true,
          reason: 'UPDATED' as const,
          updatedAtIso: '2026-07-28T00:02:00.000Z',
          lastSavedAtIso: '2026-07-28T00:02:00.000Z',
        });
      }),
    );

    await postsApi.createDraft(compose, 'create-draft-fixed');
    await postsApi.draftDetail('draft / 1');
    await postsApi.autosaveDraft('draft / 1', 1, compose);
    await postsApi.saveDraft('draft / 1', 2, compose);

    expect(calls).toEqual([
      {
        method: 'POST',
        pathname: '/api/posts/drafts',
        version: null,
        idempotencyKey: 'create-draft-fixed',
        body: compose,
      },
      {
        method: 'GET',
        pathname: '/api/posts/drafts/draft%20%2F%201',
        version: null,
        idempotencyKey: null,
        body: null,
      },
      {
        method: 'PUT',
        pathname: '/api/posts/drafts/draft%20%2F%201/autosave',
        version: '1',
        idempotencyKey: null,
        body: compose,
      },
      {
        method: 'PUT',
        pathname: '/api/posts/drafts/draft%20%2F%201',
        version: '2',
        idempotencyKey: null,
        body: compose,
      },
    ]);
  });

  it('publishes a canonical direct compose payload with a stable idempotency key', async () => {
    const compose = buildPostComposeInput({
      bodyText: '直接发布',
      mediaAssetIds: [],
      visibility: 'PUBLIC',
    });
    let captured: { body: unknown; key: string | null } | null = null;
    server.use(
      http.post('/api/posts/publish', async ({ request }) => {
        captured = {
          body: await request.json(),
          key: request.headers.get('idempotency-key'),
        };
        return apiSuccessResponse({
          postId: 'post-direct',
          publishState: 'PUBLISHED' as const,
          publishMode: 'IMMEDIATE' as const,
          pendingMediaAssetIds: [],
        });
      }),
    );

    await postsApi.publish({ ...compose, allowWaitingMediaPublish: true }, 'publish-direct-fixed');

    expect(captured).toEqual({
      body: { ...compose, allowWaitingMediaPublish: true },
      key: 'publish-direct-fixed',
    });
  });
});
