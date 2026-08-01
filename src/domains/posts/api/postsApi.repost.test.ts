import { http } from 'msw';
import { server } from '@/mocks/server';
import { postsApi } from './postsApi';
import { apiSuccessResponse } from '@/test/http';
import { requireArrayItem } from '@/shared/lib/array';

describe('postsApi repost contract', () => {
  it('creates and cancels a repost through the encoded post repost resource', async () => {
    const calls: Array<{
      method: string;
      pathname: string;
      idempotencyKey: string | null;
    }> = [];
    server.use(
      http.post('/api/posts/:postId/reposts', ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({
          repostId: 'repost-1',
          repostPostId: 'repost-post-1',
          sourcePostId: 'post / 1',
          reposted: true as const,
          noOp: false,
        });
      }),
      http.delete('/api/posts/:postId/reposts', ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({
          repostId: 'repost-1',
          sourcePostId: 'post / 1',
          canceled: true as const,
          noOp: false,
        });
      }),
    );

    await postsApi.createRepost('post / 1');
    await postsApi.cancelRepost('post / 1');

    expect(calls[0]).toMatchObject({
      method: 'POST',
      pathname: '/api/posts/post%20%2F%201/reposts',
    });
    expect(requireArrayItem(calls, 0, 'create repost call').idempotencyKey).toMatch(
      /^create-repost:/,
    );
    expect(calls[1]).toEqual({
      method: 'DELETE',
      pathname: '/api/posts/post%20%2F%201/reposts',
      idempotencyKey: null,
    });
  });
});
