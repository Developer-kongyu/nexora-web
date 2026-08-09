import { hydratePostCardBrief } from '@/domains/posts';
import { apiClient } from '@/shared/api/client';
import { createIdempotencyKey } from '@/shared/api/idempotency';
import { buildCursorQuery, type CursorRequest } from '@/shared/api/pagination';
import type {
  BatchDeleteOwnDraftsResult,
  BookmarkCollectionItemsPage,
  BookmarkCollectionSummary,
  BookmarkCollectionVisibility,
  ClearPostBrowseHistoryResult,
  ContentCenterDeletedPageView,
  ContentCenterDraftPageView,
  ContentCenterPublishedPageView,
  DeleteBookmarkCollectionResult,
  DeletePostBrowseHistoryItemResult,
  ListOwnBookmarkCollectionsResult,
  MoveBookmarkCollectionItemsInput,
  MoveBookmarkCollectionItemsResult,
  PostBrowseHistoryPageView,
  RecordPostBrowseHistoryInput,
  RecordPostBrowseHistoryResult,
  RemoveBookmarkCollectionItemsInput,
  RemoveBookmarkCollectionItemsResult,
  RemovePostBookmarkResult,
  SavePostBookmarkInput,
  SavePostBookmarkResult,
} from '../model/types';

function collectionPath(collectionId: string): string {
  return `/api/bookmarks/collections/${encodeURIComponent(collectionId)}`;
}

export const libraryApi = {
  collections: (signal?: AbortSignal) =>
    apiClient.request<ListOwnBookmarkCollectionsResult>({
      path: '/api/bookmarks/collections',
      signal,
    }),

  createCollection: (name: string, idempotencyKey = createIdempotencyKey('bookmark-collection')) =>
    apiClient.request<BookmarkCollectionSummary, { name: string }>({
      path: '/api/bookmarks/collections',
      method: 'POST',
      body: { name },
      idempotencyKey,
    }),

  renameCollection: (collectionId: string, name: string) =>
    apiClient.request<BookmarkCollectionSummary, { name: string }>({
      path: collectionPath(collectionId),
      method: 'PATCH',
      body: { name },
    }),

  updateCollectionVisibility: (collectionId: string, visibility: BookmarkCollectionVisibility) =>
    apiClient.request<BookmarkCollectionSummary, { visibility: BookmarkCollectionVisibility }>({
      path: `${collectionPath(collectionId)}/visibility`,
      method: 'PATCH',
      body: { visibility },
    }),

  deleteCollection: (collectionId: string) =>
    apiClient.request<DeleteBookmarkCollectionResult>({
      path: collectionPath(collectionId),
      method: 'DELETE',
    }),

  collectionItems: (collectionId: string, params: CursorRequest = {}, signal?: AbortSignal) =>
    apiClient.request<BookmarkCollectionItemsPage>({
      path: `${collectionPath(collectionId)}/items${buildCursorQuery(params)}`,
      signal,
    }),

  savePostBookmark: (postId: string, input: SavePostBookmarkInput = {}) =>
    apiClient.request<SavePostBookmarkResult, SavePostBookmarkInput>({
      path: `/api/bookmarks/posts/${encodeURIComponent(postId)}`,
      method: 'POST',
      body: input,
    }),

  removePostBookmark: (postId: string) =>
    apiClient.request<RemovePostBookmarkResult>({
      path: `/api/bookmarks/posts/${encodeURIComponent(postId)}`,
      method: 'DELETE',
    }),

  moveCollectionItems: (input: MoveBookmarkCollectionItemsInput) =>
    apiClient.request<MoveBookmarkCollectionItemsResult, MoveBookmarkCollectionItemsInput>({
      path: '/api/bookmarks/items/move',
      method: 'POST',
      body: input,
    }),

  removeCollectionItems: (input: RemoveBookmarkCollectionItemsInput) =>
    apiClient.request<RemoveBookmarkCollectionItemsResult, RemoveBookmarkCollectionItemsInput>({
      path: '/api/bookmarks/items/remove',
      method: 'POST',
      body: input,
    }),

  published: (params: CursorRequest = {}, signal?: AbortSignal) =>
    apiClient.request<ContentCenterPublishedPageView>({
      path: `/api/me/content-center/published${buildCursorQuery(params)}`,
      signal,
    }),

  drafts: (params: CursorRequest = {}, signal?: AbortSignal) =>
    apiClient.request<ContentCenterDraftPageView>({
      path: `/api/me/content-center/drafts${buildCursorQuery(params)}`,
      signal,
    }),

  batchDeleteDrafts: (draftIds: string[]) =>
    apiClient.request<BatchDeleteOwnDraftsResult, { draftIds: string[] }>({
      path: '/api/me/content-center/drafts/batch-delete',
      method: 'POST',
      body: { draftIds },
    }),

  deleted: (params: CursorRequest = {}, signal?: AbortSignal) =>
    apiClient.request<ContentCenterDeletedPageView>({
      path: `/api/me/content-center/deleted${buildCursorQuery(params)}`,
      signal,
    }),

  recordHistory: (input: RecordPostBrowseHistoryInput) =>
    apiClient.request<RecordPostBrowseHistoryResult, RecordPostBrowseHistoryInput>({
      path: '/api/me/history/posts',
      method: 'POST',
      body: input,
    }),

  history: async (params: CursorRequest = {}, signal?: AbortSignal) => {
    const page = await apiClient.request<PostBrowseHistoryPageView>({
      path: `/api/me/history/posts${buildCursorQuery(params)}`,
      signal,
    });
    const list = await Promise.all(
      page.list.map(async (item) => {
        if (item.itemState !== 'ACTIVE' || item.postCard.postKind !== 'REPOST') return item;

        const hydrated = await hydratePostCardBrief(item.postCard, 'bookmark', signal);
        if (!hydrated.contentPostId || hydrated.contentPostId === item.postId) return item;

        return {
          ...item,
          postCard: {
            ...item.postCard,
            bodyTextPreview: hydrated.content,
          },
        };
      }),
    );
    return { ...page, list };
  },

  deleteHistoryItem: (postId: string) =>
    apiClient.request<DeletePostBrowseHistoryItemResult>({
      path: `/api/me/history/posts/${encodeURIComponent(postId)}`,
      method: 'DELETE',
    }),

  clearHistory: () =>
    apiClient.request<ClearPostBrowseHistoryResult>({
      path: '/api/me/history/posts',
      method: 'DELETE',
    }),
};
