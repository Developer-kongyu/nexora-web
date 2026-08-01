import { http } from 'msw';
import { server } from '@/mocks/server';
import { mediaApi } from './mediaApi';
import { apiSuccessResponse } from '@/test/http';

describe('mediaApi processing retry contract', () => {
  it('uses the encoded asset retry route and preserves the formal response shape', async () => {
    let pathname = '';
    server.use(
      http.post('/api/media/assets/:mediaAssetId/retry', ({ request }) => {
        pathname = new URL(request.url).pathname;
        return apiSuccessResponse({
          mediaAssetId: 'asset / 1',
          assetKind: 'IMAGE' as const,
          currentAssetStatus: 'UPLOADED' as const,
          idempotent: false,
          requeuedCommand: 'IMAGE_PROCESS_REQUESTED' as const,
        });
      }),
    );

    const result = await mediaApi.retryProcessing('asset / 1');

    expect(pathname).toBe('/api/media/assets/asset%20%2F%201/retry');
    expect(result).toEqual({
      mediaAssetId: 'asset / 1',
      assetKind: 'IMAGE',
      currentAssetStatus: 'UPLOADED',
      idempotent: false,
      requeuedCommand: 'IMAGE_PROCESS_REQUESTED',
    });
  });
});
