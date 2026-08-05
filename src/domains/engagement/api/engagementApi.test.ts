import { http } from 'msw';
import { engagementApi } from '@/domains/engagement';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';

describe('engagementApi.impression', () => {
  it('sends the complete backend impression contract', async () => {
    let receivedBody: unknown;

    server.use(
      http.post('/api/posts/:postId/impressions', async ({ params, request }) => {
        receivedBody = await request.json();
        return apiSuccessResponse({
          status: 'ACCEPTED' as const,
          eventId: 'event-1',
          targetPostId: String(params.postId),
          metricOwnerPostId: String(params.postId),
        });
      }),
    );

    await engagementApi.impression('post-1', 'DETAIL');

    expect(receivedBody).toMatchObject({
      anonymousSessionKey: null,
      scene: 'DETAIL',
    });
    expect(receivedBody).toEqual(
      expect.objectContaining({
        deviceId: expect.stringMatching(/^web-/),
        clientEventId: expect.any(String),
        clientOccurredAtIso: expect.any(String),
      }),
    );

    const body = receivedBody as { clientEventId: string; clientOccurredAtIso: string };
    expect(body.clientEventId).not.toHaveLength(0);
    expect(Number.isNaN(Date.parse(body.clientOccurredAtIso))).toBe(false);
  });
});
