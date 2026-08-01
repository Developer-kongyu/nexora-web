import { apiClient } from '@/shared/api/client';
import { createIdempotencyKey } from '@/shared/api/idempotency';
import {
  buildCursorQuery,
  type CursorPage,
  type CursorPageView,
  type CursorRequest,
} from '@/shared/api/pagination';
import type {
  CancelRepostResult,
  CreatePostDraftResult,
  CreateCommentResult,
  CreateRepostResult,
  CreateTextEngagementInput,
  DeletePostDraftOutcomeView,
  DeleteCommentResult,
  PostComposeInput,
  PostDraftDetailView,
  PostDraftListItemView,
  PostViewModel,
  PublishPostDirectInput,
  PublishPostDirectResult,
  PublishPostFromDraftInput,
  PublishPostFromDraftResult,
  ReplyListPageView,
  SavePostDraftResult,
} from '../model/types';

export function createTextEngagementInput(bodyText: string): CreateTextEngagementInput {
  return {
    bodyText,
    mediaItems: [],
    entityRanges: [],
    linkUrl: null,
    linkCardDisabled: false,
    composerMeta: {
      editorKind: 'TEXTAREA',
      textIndexUnit: 'UTF16_CODE_UNIT',
      normalizationVersion: 'POST_TEXT_NORMALIZATION_V1',
    },
  };
}

export const postsApi = {
  detail: (postId: string, signal?: AbortSignal) =>
    apiClient.request<PostViewModel>({ path: `/api/posts/${postId}`, signal }),

  draftDetail: (draftId: string, signal?: AbortSignal) =>
    apiClient.request<PostDraftDetailView>({
      path: `/api/posts/drafts/${encodeURIComponent(draftId)}`,
      signal,
    }),

  createDraft: (input: PostComposeInput, idempotencyKey = createIdempotencyKey('create-draft')) =>
    apiClient.request<CreatePostDraftResult, PostComposeInput>({
      method: 'POST',
      path: '/api/posts/drafts',
      body: input,
      idempotencyKey,
    }),

  autosaveDraft: (
    draftId: string,
    draftVersion: number,
    input: PostComposeInput,
    signal?: AbortSignal,
  ) =>
    apiClient.request<SavePostDraftResult, PostComposeInput>({
      method: 'PUT',
      path: `/api/posts/drafts/${encodeURIComponent(draftId)}/autosave`,
      body: input,
      headers: { 'x-post-draft-version': String(draftVersion) },
      signal,
    }),

  saveDraft: (draftId: string, draftVersion: number, input: PostComposeInput) =>
    apiClient.request<SavePostDraftResult, PostComposeInput>({
      method: 'PUT',
      path: `/api/posts/drafts/${encodeURIComponent(draftId)}`,
      body: input,
      headers: { 'x-post-draft-version': String(draftVersion) },
    }),

  drafts: (input: CursorRequest = {}, signal?: AbortSignal) =>
    apiClient.request<CursorPageView<PostDraftListItemView>>({
      path: `/api/posts/drafts${buildCursorQuery(input)}`,
      signal,
    }),

  deleteDraft: (draftId: string) =>
    apiClient.request<DeletePostDraftOutcomeView>({
      method: 'DELETE',
      path: `/api/posts/drafts/${encodeURIComponent(draftId)}`,
    }),

  publishDraft: (
    draftId: string,
    input: PublishPostFromDraftInput = { allowWaitingMediaPublish: true },
    idempotencyKey = createIdempotencyKey('publish-draft'),
  ) =>
    apiClient.request<PublishPostFromDraftResult, PublishPostFromDraftInput>({
      method: 'POST',
      path: `/api/posts/drafts/${encodeURIComponent(draftId)}/publish`,
      body: input,
      idempotencyKey,
    }),

  byAuthor: (handle: string, cursor?: string, signal?: AbortSignal) =>
    apiClient.request<CursorPage<PostViewModel>>({
      path: `/api/users/${handle}/posts${buildCursorQuery({ cursor })}`,
      auth: false,
      signal,
    }),

  byCommunity: (slug: string, cursor?: string, signal?: AbortSignal) =>
    apiClient.request<CursorPage<PostViewModel>>({
      path: `/api/communities/slug/${slug}/posts${buildCursorQuery({ cursor })}`,
      auth: false,
      signal,
    }),

  publish: (input: PublishPostDirectInput, idempotencyKey = createIdempotencyKey('publish-post')) =>
    apiClient.request<PublishPostDirectResult, PublishPostDirectInput>({
      method: 'POST',
      path: '/api/posts/publish',
      body: input,
      idempotencyKey,
    }),

  listReplies: (postId: string, input: CursorRequest = {}, signal?: AbortSignal) =>
    apiClient.request<ReplyListPageView>({
      path: `/api/posts/${encodeURIComponent(postId)}/replies${buildCursorQuery(input)}`,
      signal,
    }),

  createComment: (postId: string, input: CreateTextEngagementInput) =>
    apiClient.request<CreateCommentResult, CreateTextEngagementInput>({
      method: 'POST',
      path: `/api/posts/${encodeURIComponent(postId)}/comments`,
      body: input,
      idempotencyKey: createIdempotencyKey('create-comment'),
    }),

  replyComment: (commentId: string, input: CreateTextEngagementInput) =>
    apiClient.request<CreateCommentResult, CreateTextEngagementInput>({
      method: 'POST',
      path: `/api/comments/${encodeURIComponent(commentId)}/replies`,
      body: input,
      idempotencyKey: createIdempotencyKey('reply-comment'),
    }),

  deleteComment: (commentId: string) =>
    apiClient.request<DeleteCommentResult>({
      method: 'DELETE',
      path: `/api/comments/${encodeURIComponent(commentId)}`,
    }),

  createRepost: (postId: string) =>
    apiClient.request<CreateRepostResult>({
      method: 'POST',
      path: `/api/posts/${encodeURIComponent(postId)}/reposts`,
      idempotencyKey: createIdempotencyKey('create-repost'),
    }),

  cancelRepost: (postId: string) =>
    apiClient.request<CancelRepostResult>({
      method: 'DELETE',
      path: `/api/posts/${encodeURIComponent(postId)}/reposts`,
    }),

  delete: (postId: string) =>
    apiClient.request<void>({ method: 'DELETE', path: `/api/posts/${postId}` }),
};
