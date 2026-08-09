import { http } from 'msw';
import { server } from '@/mocks/server';
import { libraryApi } from './libraryApi';
import { apiSuccessResponse, recordEmptyCursorResponse } from '@/test/http';
import { requireArrayItem } from '@/shared/lib/array';

const collection = {
  collectionId: 'collection / 1',
  name: '产品设计',
  kind: 'CUSTOM' as const,
  visibility: 'PRIVATE' as const,
  itemCount: 2,
  updatedAtIso: '2026-07-28T02:00:00.000Z',
  lastItemAddedAtIso: '2026-07-28T01:00:00.000Z',
};

function postDetailFixture(input: {
  postId: string;
  authorHandle: string;
  postKind: 'ORIGINAL' | 'REPOST';
  repostOfPostId?: string | null;
  bodyText: string | null;
}) {
  const authorUserId = `${input.authorHandle}-id`;
  return {
    postId: input.postId,
    authorUserId,
    postKind: input.postKind,
    replyToPostId: null,
    quoteOfPostId: null,
    repostOfPostId: input.repostOfPostId ?? null,
    rootPostId: null,
    bodyText: input.bodyText,
    status: 'PUBLISHED' as const,
    author: {
      userId: authorUserId,
      handle: input.authorHandle,
      displayName: input.authorHandle,
      avatarUrl: null,
    },
    community: null,
    attachedMedia: [],
    hashtags: [],
    linkCard: null,
    interactionSummary: {
      likeCount: 0,
      bookmarkCount: 0,
      commentCount: 0,
      quoteCount: 0,
      repostCount: 0,
      viewerState: null,
    },
    interactionPermission: {
      canView: true,
      canLike: true,
      canBookmark: true,
      canComment: true,
      canQuote: true,
      canRepost: true,
    },
    publishedAtIso: '2026-08-04T00:00:00.000Z',
  };
}

describe('libraryApi B07 contract', () => {
  it('uses the collection resource routes, exact bodies, and create idempotency header', async () => {
    const calls: Array<{
      method: string;
      pathname: string;
      body: unknown;
      idempotencyKey: string | null;
    }> = [];

    server.use(
      http.post('/api/bookmarks/collections', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.json(),
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse(collection);
      }),
      http.patch('/api/bookmarks/collections/:collectionId', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.json(),
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({ ...collection, name: '新名称' });
      }),
      http.patch('/api/bookmarks/collections/:collectionId/visibility', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.json(),
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({ ...collection, visibility: 'FOLLOWERS' as const });
      }),
      http.delete('/api/bookmarks/collections/:collectionId', ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: null,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({
          deleted: true as const,
          fallbackCollectionId: 'default-1',
          movedItemCount: 2,
        });
      }),
    );

    await libraryApi.createCollection('产品设计', 'create-collection-fixed');
    await libraryApi.renameCollection('collection / 1', '新名称');
    await libraryApi.updateCollectionVisibility('collection / 1', 'FOLLOWERS');
    await libraryApi.deleteCollection('collection / 1');

    expect(calls).toEqual([
      {
        method: 'POST',
        pathname: '/api/bookmarks/collections',
        body: { name: '产品设计' },
        idempotencyKey: 'create-collection-fixed',
      },
      {
        method: 'PATCH',
        pathname: '/api/bookmarks/collections/collection%20%2F%201',
        body: { name: '新名称' },
        idempotencyKey: null,
      },
      {
        method: 'PATCH',
        pathname: '/api/bookmarks/collections/collection%20%2F%201/visibility',
        body: { visibility: 'FOLLOWERS' },
        idempotencyKey: null,
      },
      {
        method: 'DELETE',
        pathname: '/api/bookmarks/collections/collection%20%2F%201',
        body: null,
        idempotencyKey: null,
      },
    ]);
  });

  it('preserves cursor pagination and exact bookmark batch payloads', async () => {
    const calls: Array<{ method: string; url: string; body: unknown }> = [];
    server.use(
      http.get('/api/bookmarks/collections/:collectionId/items', recordEmptyCursorResponse(calls)),
      http.post('/api/bookmarks/items/move', async ({ request }) => {
        calls.push({ method: request.method, url: request.url, body: await request.json() });
        return apiSuccessResponse({
          sourceCollectionId: 'source-1',
          targetCollectionId: 'target-1',
          requestedCount: 2,
          dedupedCount: 2,
          processedCount: 2,
          movedCount: 2,
          skippedCount: 0,
          movedItemIds: ['item-1', 'item-2'],
          skippedItemIds: [],
        });
      }),
      http.post('/api/bookmarks/items/remove', async ({ request }) => {
        calls.push({ method: request.method, url: request.url, body: await request.json() });
        return apiSuccessResponse({
          requestedCount: 2,
          dedupedCount: 2,
          processedCount: 2,
          removedCount: 2,
          skippedCount: 0,
          removedItemIds: ['item-1', 'item-2'],
          skippedItemIds: [],
          removedPostIds: ['post-1', 'post-2'],
        });
      }),
    );

    await libraryApi.collectionItems('collection / 1', { cursor: 'cursor / 1', limit: 25 });
    await libraryApi.moveCollectionItems({
      sourceCollectionId: 'source-1',
      targetCollectionId: 'target-1',
      itemIds: ['item-1', 'item-2'],
    });
    await libraryApi.removeCollectionItems({ itemIds: ['item-1', 'item-2'] });

    const listUrl = new URL(requireArrayItem(calls, 0, 'bookmark list call').url);
    expect(listUrl.pathname).toBe('/api/bookmarks/collections/collection%20%2F%201/items');
    expect(Object.fromEntries(listUrl.searchParams)).toEqual({
      cursor: 'cursor / 1',
      limit: '25',
    });
    expect(
      calls.slice(1).map(({ method, url, body }) => ({
        method,
        pathname: new URL(url).pathname,
        body,
      })),
    ).toEqual([
      {
        method: 'POST',
        pathname: '/api/bookmarks/items/move',
        body: {
          sourceCollectionId: 'source-1',
          targetCollectionId: 'target-1',
          itemIds: ['item-1', 'item-2'],
        },
      },
      {
        method: 'POST',
        pathname: '/api/bookmarks/items/remove',
        body: { itemIds: ['item-1', 'item-2'] },
      },
    ]);
  });

  it('uses the post bookmark resource and permits an empty save payload', async () => {
    const calls: Array<{ method: string; pathname: string; body: unknown }> = [];
    server.use(
      http.post('/api/bookmarks/posts/:postId', async ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.json(),
        });
        return apiSuccessResponse({
          bookmarkItemId: 'item-1',
          bookmarkCollectionId: 'default-1',
          action: 'ADDED' as const,
          savedAtIso: '2026-07-28T02:00:00.000Z',
        });
      }),
      http.delete('/api/bookmarks/posts/:postId', ({ request }) => {
        calls.push({ method: request.method, pathname: new URL(request.url).pathname, body: null });
        return apiSuccessResponse({
          bookmarkItemId: 'item-1',
          bookmarkCollectionId: 'default-1',
          removed: true,
        });
      }),
    );

    await libraryApi.savePostBookmark('post / 1');
    await libraryApi.removePostBookmark('post / 1');

    expect(calls).toEqual([
      {
        method: 'POST',
        pathname: '/api/bookmarks/posts/post%20%2F%201',
        body: {},
      },
      {
        method: 'DELETE',
        pathname: '/api/bookmarks/posts/post%20%2F%201',
        body: null,
      },
    ]);
  });

  it('uses only the formal content-center routes and draft batch body', async () => {
    const calls: Array<{ method: string; url: string; body: unknown }> = [];
    server.use(
      http.get('/api/me/content-center/published', ({ request }) => {
        calls.push({ method: request.method, url: request.url, body: null });
        return apiSuccessResponse({
          list: [],
          nextCursor: null,
          degraded: false,
          degradedReasons: [],
          pageMayBeShort: false,
          filteredCountHint: 0,
        });
      }),
      http.get('/api/me/content-center/drafts', recordEmptyCursorResponse(calls)),
      http.post('/api/me/content-center/drafts/batch-delete', async ({ request }) => {
        calls.push({ method: request.method, url: request.url, body: await request.json() });
        return apiSuccessResponse({ results: [] });
      }),
      http.get('/api/me/content-center/deleted', recordEmptyCursorResponse(calls)),
    );

    await libraryApi.published({ cursor: 'published-cursor', limit: 10 });
    await libraryApi.drafts({ cursor: 'draft-cursor', limit: 11 });
    await libraryApi.batchDeleteDrafts(['draft-1', 'draft-2']);
    await libraryApi.deleted({ cursor: 'deleted-cursor', limit: 12 });

    expect(
      calls.map(({ method, url, body }) => {
        const parsed = new URL(url);
        return {
          method,
          pathname: parsed.pathname,
          query: Object.fromEntries(parsed.searchParams),
          body,
        };
      }),
    ).toEqual([
      {
        method: 'GET',
        pathname: '/api/me/content-center/published',
        query: { cursor: 'published-cursor', limit: '10' },
        body: null,
      },
      {
        method: 'GET',
        pathname: '/api/me/content-center/drafts',
        query: { cursor: 'draft-cursor', limit: '11' },
        body: null,
      },
      {
        method: 'POST',
        pathname: '/api/me/content-center/drafts/batch-delete',
        query: {},
        body: { draftIds: ['draft-1', 'draft-2'] },
      },
      {
        method: 'GET',
        pathname: '/api/me/content-center/deleted',
        query: { cursor: 'deleted-cursor', limit: '12' },
        body: null,
      },
    ]);
  });

  it('uses the formal history record, list, single-delete, and clear routes', async () => {
    const calls: Array<{ method: string; url: string }> = [];
    let recordBody: unknown = null;
    server.use(
      http.post('/api/me/history/posts', async ({ request }) => {
        calls.push({ method: request.method, url: request.url });
        recordBody = await request.json();
        return apiSuccessResponse({
          recorded: true,
          deduped: false,
          lastViewedAtTouched: true,
          viewCountIncremented: true,
          lastViewedAtIso: '2026-08-05T00:00:00.000Z',
          viewCount: 1,
        });
      }),
      http.get('/api/me/history/posts', ({ request }) => {
        calls.push({ method: request.method, url: request.url });
        return apiSuccessResponse({ list: [], nextCursor: null });
      }),
      http.delete('/api/me/history/posts/:postId', ({ request }) => {
        calls.push({ method: request.method, url: request.url });
        return apiSuccessResponse({ deleted: true });
      }),
      http.delete('/api/me/history/posts', ({ request }) => {
        calls.push({ method: request.method, url: request.url });
        return apiSuccessResponse({ clearedCount: 1 });
      }),
    );

    await libraryApi.recordHistory({
      postId: 'post-history-1',
      sourceScene: 'POST_DETAIL',
      sourceModule: 'POST',
    });
    await libraryApi.history({ cursor: 'history / cursor', limit: 15 });
    await libraryApi.deleteHistoryItem('post / 1');
    await libraryApi.clearHistory();

    expect(recordBody).toEqual({
      postId: 'post-history-1',
      sourceScene: 'POST_DETAIL',
      sourceModule: 'POST',
    });

    expect(
      calls.map(({ method, url }) => {
        const parsed = new URL(url);
        return {
          method,
          pathname: parsed.pathname,
          query: Object.fromEntries(parsed.searchParams),
        };
      }),
    ).toEqual([
      {
        method: 'POST',
        pathname: '/api/me/history/posts',
        query: {},
      },
      {
        method: 'GET',
        pathname: '/api/me/history/posts',
        query: { cursor: 'history / cursor', limit: '15' },
      },
      {
        method: 'DELETE',
        pathname: '/api/me/history/posts/post%20%2F%201',
        query: {},
      },
      {
        method: 'DELETE',
        pathname: '/api/me/history/posts',
        query: {},
      },
    ]);
  });

  it('hydrates repost history items with source text returned by the backend', async () => {
    const detailRequests: string[] = [];
    server.use(
      http.get('/api/me/history/posts', () =>
        apiSuccessResponse({
          list: [
            {
              postId: 'history-repost-1',
              lastViewedAtIso: '2026-08-05T00:00:00.000Z',
              viewCount: 2,
              sourceScene: 'POST_DETAIL' as const,
              sourceModule: 'POST' as const,
              itemState: 'ACTIVE' as const,
              placeholderReasonCode: null,
              postCard: {
                postId: 'history-repost-1',
                authorUserId: 'reposter-id',
                postKind: 'REPOST' as const,
                bodyTextPreview: null,
                visibility: 'PUBLIC' as const,
                status: 'PUBLISHED' as const,
                publishedAtIso: '2026-08-04T00:00:00.000Z',
                author: {
                  userId: 'reposter-id',
                  handle: 'reposter',
                  displayName: 'Reposter',
                  avatarUrl: null,
                },
                community: null,
                attachedMedia: [],
                linkCard: null,
                interactionSummary: null,
              },
            },
          ],
          nextCursor: null,
        }),
      ),
      http.get('/api/posts/:postId', ({ params }) => {
        const postId = String(params.postId);
        detailRequests.push(postId);
        return apiSuccessResponse(
          postId === 'history-repost-1'
            ? postDetailFixture({
                postId,
                authorHandle: 'reposter',
                postKind: 'REPOST',
                repostOfPostId: 'history-source-1',
                bodyText: null,
              })
            : postDetailFixture({
                postId: 'history-source-1',
                authorHandle: 'source_author',
                postKind: 'ORIGINAL',
                bodyText: 'source text returned by backend',
              }),
        );
      }),
    );

    const page = await libraryApi.history();
    const item = requireArrayItem(page.list, 0, 'hydrated history repost');

    expect(detailRequests).toEqual(['history-repost-1', 'history-source-1']);
    expect(item).toMatchObject({
      postId: 'history-repost-1',
      itemState: 'ACTIVE',
      postCard: {
        postId: 'history-repost-1',
        postKind: 'REPOST',
        bodyTextPreview: 'source text returned by backend',
      },
    });
  });
});
