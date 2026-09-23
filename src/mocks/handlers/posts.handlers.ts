import { http, HttpResponse } from 'msw';
import { ok, cursorPageView, apiError } from './http';
import { postsState } from '../state/posts.state';
import { hasPostComposeContent, toPostComposeInput } from '@/domains/posts/model';
import type {
  PostDraftDetailView,
  PublishPostDirectInput,
  RelationPostListDegradedReason,
  ReplyListPageView,
  CreateTextEngagementInput,
  CreateCommentResult,
  DeleteCommentResult,
} from '@/domains/posts/model';
import { publishMockCompose } from './posts.helpers';
import { fixtureState } from '../state/fixtures.state';

export const postsHandlers = [
  http.get('/api/posts/drafts', ({ request }) =>
    ok(cursorPageView(postsState.mockContentCenterDrafts, request)),
  ),
  http.get('/api/posts/drafts/:draftId', ({ params }) => {
    const draft = postsState.mockDraftDetails.get(String(params.draftId));
    return draft ? ok(draft) : apiError(404, 'POST_DRAFT_NOT_FOUND', '草稿不存在');
  }),
  http.post('/api/posts/drafts', async ({ request }) => {
    if (!request.headers.get('idempotency-key')) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少幂等键');
    }
    const rawInput = await request.json();
    if (!postsState.isMockPostComposeInput(rawInput) || !hasPostComposeContent(rawInput)) {
      return apiError(400, 'POST_DRAFT_INPUT_INVALID', '草稿正文、媒体或链接至少需要一项');
    }

    const draftId = `draft-${crypto.randomUUID()}`;
    const updatedAtIso = new Date().toISOString();
    const detail: PostDraftDetailView = {
      draftId,
      draftVersion: 1,
      state: 'EDITABLE',
      composeSnapshot: postsState.draftComposeSnapshot(rawInput),
      validationDiagnostics: null,
      linkPreviewState: postsState.mockDraftLinkPreviewState(rawInput),
      updatedAtIso,
      lastAutosavedAtIso: null,
      lastSavedAtIso: updatedAtIso,
    };
    postsState.mockDraftDetails.set(draftId, detail);
    postsState.syncMockDraftList(detail);
    return ok({
      draftId,
      draftVersion: 1,
      saved: true as const,
      created: true as const,
      bodyTextPreview: rawInput.bodyText?.slice(0, 160) ?? null,
      updatedAtIso,
    });
  }),
  http.put('/api/posts/drafts/:draftId/autosave', ({ params, request }) =>
    postsState.updateMockDraft(String(params.draftId), request, 'AUTOSAVE'),
  ),
  http.put('/api/posts/drafts/:draftId', ({ params, request }) =>
    postsState.updateMockDraft(String(params.draftId), request, 'SAVE'),
  ),
  http.delete('/api/posts/drafts/:draftId', ({ params }) => {
    const draftId = String(params.draftId);
    const exists = postsState.removeMockDraft(draftId);
    return ok({
      draftId,
      outcome: exists ? ('DELETED_NOW' as const) : ('ALREADY_DELETED' as const),
    });
  }),
  http.post('/api/posts/drafts/:draftId/publish', async ({ params, request }) => {
    const draftId = String(params.draftId);
    const idempotencyKey = request.headers.get('idempotency-key');
    const body = (await request.json()) as { allowWaitingMediaPublish?: unknown };
    if (!idempotencyKey) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少幂等键');
    }
    if (typeof body.allowWaitingMediaPublish !== 'boolean') {
      return apiError(400, 'POST_PUBLISH_INPUT_INVALID', '发布请求不合法');
    }

    const draft = postsState.mockDraftDetails.get(draftId);
    if (!draft) return apiError(404, 'POST_DRAFT_NOT_FOUND', '草稿不存在');

    const publishInput: PublishPostDirectInput = {
      ...toPostComposeInput(draft.composeSnapshot),
      allowWaitingMediaPublish: body.allowWaitingMediaPublish,
    };
    const pendingMediaAssetIds = postsState.pendingMockMediaAssetIds(publishInput);
    if (pendingMediaAssetIds.length && !body.allowWaitingMediaPublish) {
      return apiError(409, 'POST_MEDIA_NOT_READY', '媒体尚未处理完成');
    }

    const result = publishMockCompose(`published-${draftId}`, publishInput);
    postsState.removeMockDraft(draftId);
    return ok({ ...result, draftId });
  }),
  http.get('/api/posts/:postId', ({ params }) => {
    const detail = postsState.mockPostDetail(String(params.postId));
    return detail ? ok(detail) : apiError(404, 'POST_NOT_FOUND', 'Post not found');
  }),
  http.post('/api/posts/publish', async ({ request }) => {
    if (!request.headers.get('idempotency-key')) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少幂等键');
    }
    const rawInput = await request.json();
    if (
      !postsState.isMockPostComposeInput(rawInput) ||
      typeof (rawInput as Partial<PublishPostDirectInput>).allowWaitingMediaPublish !== 'boolean' ||
      !hasPostComposeContent(rawInput)
    ) {
      return apiError(400, 'POST_PUBLISH_INPUT_INVALID', '发布请求不合法');
    }
    const input = rawInput as PublishPostDirectInput;
    const pendingMediaAssetIds = postsState.pendingMockMediaAssetIds(input);
    if (pendingMediaAssetIds.length && !input.allowWaitingMediaPublish) {
      return apiError(409, 'POST_MEDIA_NOT_READY', '媒体尚未处理完成');
    }
    return ok(publishMockCompose(crypto.randomUUID(), input));
  }),
  http.get('/api/posts/:postId/replies', ({ params, request }) => {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get('limit') ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, Math.trunc(requestedLimit)))
      : 20;
    const cursorValue = url.searchParams.get('cursor');
    const startIndex = cursorValue?.startsWith('mock-comment-cursor:')
      ? Number(cursorValue.slice('mock-comment-cursor:'.length))
      : 0;
    const allItems = postsState.mockRepliesByPostId[String(params.postId)] ?? [];
    const list = allItems.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + list.length;
    const degradedReasons: RelationPostListDegradedReason[] = list.some(
      (item) => item.tombstone !== null,
    )
      ? ['REPLY_TOMBSTONE_EXPOSED']
      : [];
    const response = {
      list,
      nextCursor: nextIndex < allItems.length ? `mock-comment-cursor:${nextIndex}` : null,
      degraded: degradedReasons.length > 0,
      degradedReasons,
      pageMayBeShort: false,
      filteredCountHint: 0,
    } satisfies ReplyListPageView;
    return ok(response);
  }),
  http.post('/api/posts/:postId/comments', async ({ params, request }) => {
    const body = (await request.json()) as CreateTextEngagementInput;
    if (!body.bodyText.trim()) return new HttpResponse(null, { status: 400 });
    const rootPostId = String(params.postId);
    const commentId = crypto.randomUUID();
    const commentPostId = crypto.randomUUID();
    const createdAtIso = new Date().toISOString();
    const item = postsState.mockReplyItem({
      commentId,
      commentPostId,
      authorUserId: fixtureState.currentUser.id,
      bodyText: body.bodyText,
      parentCommentId: null,
      topLevelCommentId: null,
      depth: 0,
      createdAtIso,
    });
    postsState.mockRepliesByPostId[rootPostId] = [
      item,
      ...(postsState.mockRepliesByPostId[rootPostId] ?? []),
    ];
    postsState.mockCommentRootPostIds.set(commentId, rootPostId);
    postsState.updateMockRootCommentCount(rootPostId, 1);
    const response = {
      comment: {
        commentId,
        commentPostId,
        rootPostId,
        parentCommentId: null,
        topLevelCommentId: null,
        authorUserId: fixtureState.currentUser.id,
        depth: 0,
        status: 'ACTIVE',
        directReplyCount: 0,
        descendantReplyCount: 0,
        createdAtIso,
        activatedAtIso: createdAtIso,
        publishFailedAtIso: null,
        deletedAtIso: null,
      },
      counters: postsState.mockPostCounters(rootPostId),
      derivedPostPublish: {
        publishState: 'PUBLISHED',
        publishMode: 'IMMEDIATE',
        pendingMediaAssetIds: [],
      },
    } satisfies CreateCommentResult;
    return ok(response);
  }),
  http.post('/api/comments/:commentId/replies', async ({ params, request }) => {
    const parentCommentId = String(params.commentId);
    const parent = postsState.findMockComment(parentCommentId);
    if (!parent?.item.postCard || parent.item.relation.status !== 'ACTIVE') {
      return new HttpResponse(null, { status: 404 });
    }
    const body = (await request.json()) as CreateTextEngagementInput;
    if (!body.bodyText.trim()) return new HttpResponse(null, { status: 400 });
    const commentId = crypto.randomUUID();
    const commentPostId = crypto.randomUUID();
    const rootPostId = postsState.mockCommentRootPostIds.get(parentCommentId) ?? 'post-1';
    const createdAtIso = new Date().toISOString();
    const topLevelCommentId =
      parent.item.relation.topLevelCommentId ?? parent.item.relation.commentId;
    postsState.mockCommentRootPostIds.set(commentId, rootPostId);
    postsState.incrementMockChildCount(parentCommentId, 1);
    postsState.updateMockRootCommentCount(rootPostId, 1);
    const response = {
      comment: {
        commentId,
        commentPostId,
        rootPostId,
        parentCommentId,
        topLevelCommentId,
        authorUserId: fixtureState.currentUser.id,
        depth: parent.item.relation.depth + 1,
        status: 'ACTIVE',
        directReplyCount: 0,
        descendantReplyCount: 0,
        createdAtIso,
        activatedAtIso: createdAtIso,
        publishFailedAtIso: null,
        deletedAtIso: null,
      },
      counters: postsState.mockPostCounters(rootPostId),
      derivedPostPublish: {
        publishState: 'PUBLISHED',
        publishMode: 'IMMEDIATE',
        pendingMediaAssetIds: [],
      },
    } satisfies CreateCommentResult;
    return ok(response);
  }),
  http.delete('/api/comments/:commentId', ({ params }) => {
    const commentId = String(params.commentId);
    const found = postsState.findMockComment(commentId);
    const rootPostId = postsState.mockCommentRootPostIds.get(commentId);
    if (!found || found.item.relation.status !== 'ACTIVE') {
      const response = {
        commentId,
        deleted: true,
        noOp: true,
        outcome: 'ALREADY_DELETED',
        counters: rootPostId ? postsState.mockPostCounters(rootPostId) : null,
      } satisfies DeleteCommentResult;
      return ok(response);
    }
    found.list[found.index] = {
      relation: { ...found.item.relation, status: 'DELETED' },
      postCard: null,
      tombstone: { state: 'DELETED' },
    };
    if (rootPostId) postsState.updateMockRootCommentCount(rootPostId, -1);
    const response = {
      commentId,
      deleted: true,
      noOp: false,
      outcome: 'DELETED_NOW',
      counters: rootPostId ? postsState.mockPostCounters(rootPostId) : null,
    } satisfies DeleteCommentResult;
    return ok(response);
  }),
  http.post('/api/posts/:postId/like', ({ params }) => {
    postsState.updateMockPostInteraction(String(params.postId), 'like', true);
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete('/api/posts/:postId/like', ({ params }) => {
    postsState.updateMockPostInteraction(String(params.postId), 'like', false);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('/api/posts/:postId/impressions', () => new HttpResponse(null, { status: 204 })),
];
