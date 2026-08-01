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
      http.patch(
        '/api/bookmarks/collections/:collectionId/visibility',
        async ({ request }) => {
          calls.push({
            method: request.method,
            pathname: new URL(request.url).pathname,
            body: await request.json(),
            idempotencyKey: request.headers.get('idempotency-key'),
          });
          return apiSuccessResponse({ ...collection, visibility: 'FOLLOWERS' as const });
        },
      ),
      http.delete('/api/bookmarks/collections/:collectionId', ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: null,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({ deleted: true as const, fallbackCollectionId: 'default-1', movedItemCount: 2 });
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
      http.get(
        '/api/bookmarks/collections/:collectionId/items',
        recordEmptyCursorResponse(calls),
      ),
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
    expect(calls.slice(1).map(({ method, url, body }) => ({
      method,
      pathname: new URL(url).pathname,
      body,
    }))).toEqual([
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

    expect(calls.map(({ method, url, body }) => {
      const parsed = new URL(url);
      return {
        method,
        pathname: parsed.pathname,
        query: Object.fromEntries(parsed.searchParams),
        body,
      };
    })).toEqual([
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

  it('uses the formal history list, single-delete, and clear routes', async () => {
    const calls: Array<{ method: string; url: string }> = [];
    server.use(
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

    await libraryApi.history({ cursor: 'history / cursor', limit: 15 });
    await libraryApi.deleteHistoryItem('post / 1');
    await libraryApi.clearHistory();

    expect(calls.map(({ method, url }) => {
      const parsed = new URL(url);
      return {
        method,
        pathname: parsed.pathname,
        query: Object.fromEntries(parsed.searchParams),
      };
    })).toEqual([
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
});
