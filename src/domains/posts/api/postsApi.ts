import { apiClient } from '@/shared/api/client';
import { createIdempotencyKey } from '@/shared/api/idempotency';
import { buildCursorQuery, type CursorPageView, type CursorRequest } from '@/shared/api/pagination';
import {
  mergeReplyTarget,
  mergeRepostSource,
  postCardBriefToViewModel,
  postDetailToViewModel,
} from '../lib/postCardAdapter';
import type {
  CancelRepostResult,
  CreatePostDraftResult,
  CreateCommentResult,
  CreateRepostResult,
  CreateTextEngagementInput,
  DeletePostDraftOutcomeView,
  DeleteCommentResult,
  PostCardBriefView,
  PostDetailDto,
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
async function requestPostDetail(postId: string, signal?: AbortSignal): Promise<PostDetailDto> {
  return apiClient.request<PostDetailDto>({
    path: `/api/posts/${encodeURIComponent(postId)}`,
    signal,
  });
}

async function getHydratedPostDetail(postId: string, signal?: AbortSignal) {
  const detail = await requestPostDetail(postId, signal);
  const post = postDetailToViewModel(detail);
  if (detail.postKind === 'REPOST' && detail.repostOfPostId) {
    const source = postDetailToViewModel(await requestPostDetail(detail.repostOfPostId, signal));
    return mergeRepostSource(post, source);
  }

  if (detail.postKind === 'REPLY' && detail.replyToPostId) {
    try {
      const target = postDetailToViewModel(await requestPostDetail(detail.replyToPostId, signal));
      return mergeReplyTarget(post, target);
    } catch (error) {
      if (signal?.aborted) throw error;
      return post;
    }
  }

  return post;
}

/**
 * 将列表接口返回的薄卡片补齐为可直接展示的关系卡片。
 * 回复需要直接父级作者，转发需要原帖正文；读取失败时仍保留薄卡片本身。
 */
export async function hydratePostCardBrief(
  card: PostCardBriefView,
  variant: NonNullable<PostViewModel['variant']>,
  signal?: AbortSignal,
): Promise<PostViewModel> {
  const fallback = postCardBriefToViewModel(card, variant);
  if (card.postKind !== 'REPLY' && card.postKind !== 'REPOST') return fallback;

  try {
    return {
      ...(await getHydratedPostDetail(card.postId, signal)),
      variant,
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return fallback;
  }
}

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
function buildCommentRepliesQuery(commentId: string, input: CursorRequest): string {
  const paginationQuery = buildCursorQuery(input);
  const separator = paginationQuery.length === 0 ? '?' : '&';
  return `${paginationQuery}${separator}parentCommentId=${encodeURIComponent(commentId)}`;
}

export const postsApi = {
  detail: getHydratedPostDetail,

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

  byAuthor: async (handle: string, cursor?: string, signal?: AbortSignal) => {
    const page = await apiClient.request<CursorPageView<PostCardBriefView>>({
      path: `/api/users/${encodeURIComponent(handle)}/posts${buildCursorQuery({ cursor })}`,
      signal,
    });
    const list = await Promise.all(
      page.list.map(async (card) => {
        return hydratePostCardBrief(card, 'profile', signal);
      }),
    );
    return {
      list,
      nextCursor: page.nextCursor,
      hasMore: page.nextCursor !== null,
    };
  },

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

  listCommentReplies: (
    rootPostId: string,
    commentId: string,
    input: CursorRequest = {},
    signal?: AbortSignal,
  ) =>
    apiClient.request<ReplyListPageView>({
      path: `/api/posts/${encodeURIComponent(rootPostId)}/replies${buildCommentRepliesQuery(commentId, input)}`,
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
