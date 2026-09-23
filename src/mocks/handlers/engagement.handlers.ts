import { http } from 'msw';
import { apiError, ok } from './http';
import { postsState } from '../state/posts.state';
import { engagementState } from '../state/engagement.state';

export const engagementHandlers = [
  http.post('/api/posts/:postId/reposts', ({ params, request }) => {
    if (!request.headers.get('idempotency-key')) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少 Idempotency-Key');
    }
    const sourcePostId = String(params.postId);
    if (!postsState.mockPostCard(sourcePostId))
      return apiError(404, 'POST_NOT_FOUND', '帖子不存在');
    const noOp = engagementState.mockRepostedPostIds.has(sourcePostId);
    engagementState.mockRepostedPostIds.add(sourcePostId);
    postsState.updateMockPostInteraction(sourcePostId, 'repost', true);
    return ok({
      repostId: `repost-relation-${sourcePostId}`,
      repostPostId: `repost-post-${sourcePostId}`,
      sourcePostId,
      reposted: true as const,
      noOp,
    });
  }),
  http.delete('/api/posts/:postId/reposts', ({ params }) => {
    const sourcePostId = String(params.postId);
    const existed = engagementState.mockRepostedPostIds.delete(sourcePostId);
    postsState.updateMockPostInteraction(sourcePostId, 'repost', false);
    return ok({
      repostId: existed ? `repost-relation-${sourcePostId}` : null,
      sourcePostId,
      canceled: true as const,
      noOp: !existed,
    });
  }),
];
