import { http } from 'msw';
import { libraryState } from '../state/library.state';
import { ok, apiError, cursorPageView } from './http';
import type {
  BookmarkCollectionSummary,
  BookmarkCollectionItemCardView,
  RecordPostBrowseHistoryInput,
} from '@/domains/library/model';
import { fixtureState } from '../state/fixtures.state';
import { postsState } from '../state/posts.state';

export const libraryHandlers = [
  http.get('/api/bookmarks/collections', () => {
    libraryState.refreshMockBookmarkCollectionCounts();
    return ok({
      list: libraryState.mockBookmarkCollections.map((collection) => ({ ...collection })),
    });
  }),
  http.post('/api/bookmarks/collections', async ({ request }) => {
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return apiError(400, 'BOOKMARK_IDEMPOTENCY_KEY_REQUIRED', '缺少 Idempotency-Key');
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (
      Object.keys(body).some((key) => key !== 'name') ||
      typeof body.name !== 'string' ||
      !body.name.trim()
    ) {
      return apiError(400, 'BOOKMARK_COLLECTION_NAME_INVALID', '收藏夹名称不合法');
    }
    const name = body.name.trim();
    if (libraryState.mockBookmarkCollections.some((collection) => collection.name === name)) {
      return apiError(409, 'BOOKMARK_COLLECTION_NAME_CONFLICT', '收藏夹名称已存在');
    }
    const now = new Date().toISOString();
    const created: BookmarkCollectionSummary = {
      collectionId: `bookmark-${crypto.randomUUID()}`,
      name,
      kind: 'CUSTOM',
      visibility: 'PRIVATE',
      itemCount: 0,
      updatedAtIso: now,
      lastItemAddedAtIso: null,
    };
    libraryState.mockBookmarkCollections = [...libraryState.mockBookmarkCollections, created];
    return ok(created);
  }),
  http.patch('/api/bookmarks/collections/:id/visibility', async ({ params, request }) => {
    const collectionId = String(params.id);
    const collection = libraryState.findMockBookmarkCollection(collectionId);
    if (!collection) return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    const body = (await request.json()) as Record<string, unknown>;
    const value = body.visibility;
    if (
      Object.keys(body).some((key) => key !== 'visibility') ||
      (value !== 'PUBLIC' && value !== 'FOLLOWERS' && value !== 'PRIVATE')
    ) {
      return apiError(400, 'BOOKMARK_COLLECTION_VISIBILITY_INVALID', '可见范围不合法');
    }
    if (collection.kind === 'DEFAULT' && value !== 'PRIVATE') {
      return apiError(409, 'BOOKMARK_DEFAULT_COLLECTION_PROTECTED', '默认收藏夹固定为私密');
    }
    const updated: BookmarkCollectionSummary = {
      ...collection,
      visibility: value,
      updatedAtIso: new Date().toISOString(),
    };
    libraryState.mockBookmarkCollections = libraryState.mockBookmarkCollections.map((item) =>
      item.collectionId === collectionId ? updated : item,
    );
    return ok(updated);
  }),
  http.patch('/api/bookmarks/collections/:id', async ({ params, request }) => {
    const collectionId = String(params.id);
    const collection = libraryState.findMockBookmarkCollection(collectionId);
    if (!collection) return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    if (collection.kind === 'DEFAULT') {
      return apiError(409, 'BOOKMARK_DEFAULT_COLLECTION_PROTECTED', '默认收藏夹不可重命名');
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (
      Object.keys(body).some((key) => key !== 'name') ||
      typeof body.name !== 'string' ||
      !body.name.trim()
    ) {
      return apiError(400, 'BOOKMARK_COLLECTION_NAME_INVALID', '收藏夹名称不合法');
    }
    const name = body.name.trim();
    if (
      libraryState.mockBookmarkCollections.some(
        (item) => item.collectionId !== collectionId && item.name === name,
      )
    ) {
      return apiError(409, 'BOOKMARK_COLLECTION_NAME_CONFLICT', '收藏夹名称已存在');
    }
    const updated = { ...collection, name, updatedAtIso: new Date().toISOString() };
    libraryState.mockBookmarkCollections = libraryState.mockBookmarkCollections.map((item) =>
      item.collectionId === collectionId ? updated : item,
    );
    return ok(updated);
  }),
  http.delete('/api/bookmarks/collections/:id', ({ params }) => {
    const collectionId = String(params.id);
    const collection = libraryState.findMockBookmarkCollection(collectionId);
    if (!collection) return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    if (collection.kind === 'DEFAULT') {
      return apiError(409, 'BOOKMARK_DEFAULT_COLLECTION_PROTECTED', '默认收藏夹不可删除');
    }
    const movedItems = libraryState.mockBookmarkItems.filter(
      (item) => item.bookmarkCollectionId === collectionId,
    );
    libraryState.mockBookmarkItems = libraryState.mockBookmarkItems.map(
      (item): BookmarkCollectionItemCardView => {
        if (item.bookmarkCollectionId !== collectionId) return item;
        if (item.itemState === 'ACTIVE') {
          return {
            ...item,
            bookmarkCollectionId: libraryState.MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
            postCard:
              libraryState.cloneMockPostCardForBookmark(
                item.postId,
                libraryState.MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
              ) ?? item.postCard,
          };
        }
        return {
          ...item,
          bookmarkCollectionId: libraryState.MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
          postCard: null,
        };
      },
    );
    libraryState.mockBookmarkCollections = libraryState.mockBookmarkCollections.filter(
      (item) => item.collectionId !== collectionId,
    );
    libraryState.refreshMockBookmarkCollectionCounts();
    return ok({
      deleted: true as const,
      fallbackCollectionId: libraryState.MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
      movedItemCount: movedItems.length,
    });
  }),
  http.get('/api/bookmarks/collections/:id/items', ({ params, request }) => {
    const collectionId = String(params.id);
    if (!libraryState.findMockBookmarkCollection(collectionId)) {
      return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    }
    const list = libraryState.mockBookmarkItems
      .filter((item) => item.bookmarkCollectionId === collectionId)
      .map((item): BookmarkCollectionItemCardView =>
        item.itemState === 'ACTIVE'
          ? {
              ...item,
              postCard:
                libraryState.cloneMockPostCardForBookmark(item.postId, collectionId) ??
                item.postCard,
            }
          : item,
      )
      .sort((a, b) => b.savedAtIso.localeCompare(a.savedAtIso));
    return ok(cursorPageView(list, request));
  }),
  http.post('/api/bookmarks/posts/:postId', async ({ params, request }) => {
    const postId = String(params.postId);
    const body = (await request.json()) as Record<string, unknown>;
    if (Object.keys(body).some((key) => key !== 'targetCollectionId' && key !== 'sourceScene')) {
      return apiError(400, 'BOOKMARK_REQUEST_INVALID', '收藏请求字段不合法');
    }
    const targetCollectionId =
      typeof body.targetCollectionId === 'string'
        ? body.targetCollectionId
        : libraryState.MOCK_DEFAULT_BOOKMARK_COLLECTION_ID;
    if (!libraryState.findMockBookmarkCollection(targetCollectionId)) {
      return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '目标收藏夹不存在');
    }
    const postCard = libraryState.cloneMockPostCardForBookmark(postId, targetCollectionId);
    if (!postCard) return apiError(404, 'POST_NOT_FOUND', '帖子不存在');
    const existingIndex = libraryState.mockBookmarkItems.findIndex(
      (item) => item.postId === postId,
    );
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      const existing = libraryState.mockBookmarkItems[existingIndex];
      if (!existing) {
        return apiError(500, 'MOCK_BOOKMARK_STATE_INVALID', '收藏夹具状态不一致');
      }
      const action =
        existing.itemState === 'PLACEHOLDER'
          ? ('RESTORED' as const)
          : existing.bookmarkCollectionId === targetCollectionId
            ? ('UNCHANGED' as const)
            : ('MOVED' as const);
      const updated: BookmarkCollectionItemCardView = {
        bookmarkItemId: existing.bookmarkItemId,
        postId,
        bookmarkCollectionId: targetCollectionId,
        savedAtIso: action === 'UNCHANGED' ? existing.savedAtIso : now,
        itemState: 'ACTIVE',
        placeholderReasonCode: null,
        postCard,
      };
      libraryState.mockBookmarkItems[existingIndex] = updated;
      libraryState.refreshMockBookmarkCollectionCounts();
      return ok({
        bookmarkItemId: updated.bookmarkItemId,
        bookmarkCollectionId: targetCollectionId,
        action,
        savedAtIso: updated.savedAtIso,
      });
    }
    const created: BookmarkCollectionItemCardView = {
      bookmarkItemId: `bookmark-item-${crypto.randomUUID()}`,
      postId,
      bookmarkCollectionId: targetCollectionId,
      savedAtIso: now,
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard,
    };
    libraryState.mockBookmarkItems = [created, ...libraryState.mockBookmarkItems];
    libraryState.refreshMockBookmarkCollectionCounts();
    return ok({
      bookmarkItemId: created.bookmarkItemId,
      bookmarkCollectionId: targetCollectionId,
      action: 'ADDED' as const,
      savedAtIso: created.savedAtIso,
    });
  }),
  http.delete('/api/bookmarks/posts/:postId', ({ params }) => {
    const postId = String(params.postId);
    const existing = libraryState.mockBookmarkItems.find((item) => item.postId === postId) ?? null;
    libraryState.mockBookmarkItems = libraryState.mockBookmarkItems.filter(
      (item) => item.postId !== postId,
    );
    libraryState.refreshMockBookmarkCollectionCounts();
    return ok({
      bookmarkItemId: existing?.bookmarkItemId ?? null,
      bookmarkCollectionId: existing?.bookmarkCollectionId ?? null,
      removed: Boolean(existing),
    });
  }),
  http.post('/api/bookmarks/items/move', async ({ request }) => {
    const body = (await request.json()) as {
      sourceCollectionId?: unknown;
      targetCollectionId?: unknown;
      itemIds?: unknown;
    };
    if (
      typeof body.sourceCollectionId !== 'string' ||
      typeof body.targetCollectionId !== 'string' ||
      !Array.isArray(body.itemIds) ||
      body.itemIds.some((item) => typeof item !== 'string')
    ) {
      return apiError(400, 'BOOKMARK_BATCH_REQUEST_INVALID', '批量移动请求不合法');
    }
    if (
      !libraryState.findMockBookmarkCollection(body.sourceCollectionId) ||
      !libraryState.findMockBookmarkCollection(body.targetCollectionId)
    ) {
      return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    }
    const requested = body.itemIds as string[];
    const deduped = [...new Set(requested)];
    const movedItemIds: string[] = [];
    const skippedItemIds: string[] = [];
    for (const itemId of deduped) {
      const index = libraryState.mockBookmarkItems.findIndex(
        (item) =>
          item.bookmarkItemId === itemId && item.bookmarkCollectionId === body.sourceCollectionId,
      );
      if (index < 0 || body.sourceCollectionId === body.targetCollectionId) {
        skippedItemIds.push(itemId);
        continue;
      }
      const item = libraryState.mockBookmarkItems[index];
      if (!item) {
        skippedItemIds.push(itemId);
        continue;
      }
      libraryState.mockBookmarkItems = libraryState.mockBookmarkItems.filter(
        (candidate) =>
          candidate.bookmarkItemId === item.bookmarkItemId ||
          !(
            candidate.postId === item.postId &&
            candidate.bookmarkCollectionId === body.targetCollectionId
          ),
      );
      const nextIndex = libraryState.mockBookmarkItems.findIndex(
        (candidate) => candidate.bookmarkItemId === item.bookmarkItemId,
      );
      if (nextIndex < 0) {
        skippedItemIds.push(itemId);
        continue;
      }
      const updated: BookmarkCollectionItemCardView =
        item.itemState === 'ACTIVE'
          ? {
              ...item,
              bookmarkCollectionId: body.targetCollectionId,
              postCard:
                libraryState.cloneMockPostCardForBookmark(item.postId, body.targetCollectionId) ??
                item.postCard,
            }
          : {
              ...item,
              bookmarkCollectionId: body.targetCollectionId,
              postCard: null,
            };
      libraryState.mockBookmarkItems[nextIndex] = updated;
      movedItemIds.push(itemId);
    }
    libraryState.refreshMockBookmarkCollectionCounts();
    return ok({
      sourceCollectionId: body.sourceCollectionId,
      targetCollectionId: body.targetCollectionId,
      requestedCount: requested.length,
      dedupedCount: deduped.length,
      processedCount: deduped.length,
      movedCount: movedItemIds.length,
      skippedCount: skippedItemIds.length,
      movedItemIds,
      skippedItemIds,
    });
  }),
  http.post('/api/bookmarks/items/remove', async ({ request }) => {
    const body = (await request.json()) as { itemIds?: unknown };
    if (!Array.isArray(body.itemIds) || body.itemIds.some((item) => typeof item !== 'string')) {
      return apiError(400, 'BOOKMARK_BATCH_REQUEST_INVALID', '批量移除请求不合法');
    }
    const requested = body.itemIds as string[];
    const deduped = [...new Set(requested)];
    const removed = libraryState.mockBookmarkItems.filter((item) =>
      deduped.includes(item.bookmarkItemId),
    );
    const removedIds = new Set(removed.map((item) => item.bookmarkItemId));
    libraryState.mockBookmarkItems = libraryState.mockBookmarkItems.filter(
      (item) => !removedIds.has(item.bookmarkItemId),
    );
    const skippedItemIds = deduped.filter((itemId) => !removedIds.has(itemId));
    libraryState.refreshMockBookmarkCollectionCounts();
    return ok({
      requestedCount: requested.length,
      dedupedCount: deduped.length,
      processedCount: deduped.length,
      removedCount: removed.length,
      skippedCount: skippedItemIds.length,
      removedItemIds: [...removedIds],
      skippedItemIds,
      removedPostIds: removed.map((item) => item.postId),
    });
  }),
  http.get('/api/me/content-center/published', ({ request }) => {
    const cards = fixtureState.posts.map((post) => {
      const bookmark = libraryState.mockBookmarkItems.find((item) => item.postId === post.id);
      if (!bookmark) return postsState.requiredMockPostCard(post.id);
      return (
        libraryState.cloneMockPostCardForBookmark(post.id, bookmark.bookmarkCollectionId) ??
        postsState.requiredMockPostCard(post.id)
      );
    });
    return ok({
      ...cursorPageView(cards, request),
      degraded: false,
      degradedReasons: [],
      pageMayBeShort: false,
      filteredCountHint: 0,
    });
  }),
  http.get('/api/me/content-center/drafts', ({ request }) =>
    ok(cursorPageView(postsState.mockContentCenterDrafts, request)),
  ),
  http.post('/api/me/content-center/drafts/batch-delete', async ({ request }) => {
    const body = (await request.json()) as { draftIds?: unknown };
    if (!Array.isArray(body.draftIds) || body.draftIds.some((item) => typeof item !== 'string')) {
      return apiError(400, 'POST_DRAFT_BATCH_INVALID', '草稿批量删除请求不合法');
    }
    const results = (body.draftIds as string[]).map((draftId) => {
      const exists = postsState.mockContentCenterDrafts.some((draft) => draft.draftId === draftId);
      if (!exists) {
        return {
          draftId,
          succeeded: false,
          outcome: null,
          errorCode: 'DRAFT_NOT_FOUND' as const,
          errorMessage: '草稿不存在',
        };
      }
      postsState.removeMockDraft(draftId);
      return {
        draftId,
        succeeded: true,
        outcome: 'DELETED_NOW' as const,
        errorCode: null,
        errorMessage: null,
      };
    });
    return ok({ results });
  }),
  http.get('/api/me/content-center/deleted', ({ request }) =>
    ok(cursorPageView(postsState.mockDeletedContent, request)),
  ),
  http.post('/api/me/history/posts', async ({ request }) => {
    const body = (await request.json()) as RecordPostBrowseHistoryInput;
    const postCard = postsState.mockPostCard(body.postId);
    if (!postCard) return apiError(404, 'POST_NOT_FOUND', 'Post not found');

    const now = new Date().toISOString();
    const existingIndex = libraryState.mockBrowseHistory.findIndex(
      (item) => item.postId === body.postId,
    );
    const previous = existingIndex >= 0 ? libraryState.mockBrowseHistory[existingIndex] : null;
    const viewCount = (previous?.viewCount ?? 0) + 1;
    if (existingIndex >= 0) libraryState.mockBrowseHistory.splice(existingIndex, 1);
    libraryState.mockBrowseHistory.unshift({
      postId: body.postId,
      lastViewedAtIso: now,
      viewCount,
      sourceScene: body.sourceScene,
      sourceModule: body.sourceModule,
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard,
    });

    return ok({
      recorded: true,
      deduped: false,
      lastViewedAtTouched: true,
      viewCountIncremented: true,
      lastViewedAtIso: now,
      viewCount,
    });
  }),
  http.get('/api/me/history/posts', ({ request }) =>
    ok(
      cursorPageView(
        libraryState.mockBrowseHistory.map((item) =>
          item.itemState === 'ACTIVE'
            ? {
                ...item,
                postCard: postsState.mockPostCard(item.postId) ?? item.postCard,
              }
            : item,
        ),
        request,
      ),
    ),
  ),
  http.delete('/api/me/history/posts/:postId', ({ params }) => {
    const postId = String(params.postId);
    const before = libraryState.mockBrowseHistory.length;
    libraryState.mockBrowseHistory = libraryState.mockBrowseHistory.filter(
      (item) => item.postId !== postId,
    );
    return ok({ deleted: libraryState.mockBrowseHistory.length < before });
  }),
  http.delete('/api/me/history/posts', () => {
    const clearedCount = libraryState.mockBrowseHistory.length;
    libraryState.mockBrowseHistory = [];
    return ok({ clearedCount });
  }),
];
