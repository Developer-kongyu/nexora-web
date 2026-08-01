import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { apiClient } from './client';

describe('apiClient cancellation', () => {
  it('rejects a pre-aborted request without invoking the transport', async () => {
    let transportCalls = 0;
    server.use(
      http.get('/api/test/pre-aborted', () => {
        transportCalls += 1;
        return HttpResponse.json({ code: 'OK', message: 'ok', data: { ok: true } });
      }),
    );
    const controller = new AbortController();
    controller.abort('caller-canceled');

    await expect(
      apiClient.request<{ ok: boolean }>({
        path: '/api/test/pre-aborted',
        auth: false,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      code: 'REQUEST_ABORTED',
      httpStatus: 0,
      message: '请求已取消或超时',
      cause: expect.objectContaining({
        message: '请求已取消',
        cause: 'caller-canceled',
      }),
    });
    expect(transportCalls).toBe(0);
  });
});
