import { feedApi } from '@/domains/feed';

describe('apiClient + MSW', () => {
  it('unwraps the standard API envelope', async () => {
    const page = await feedApi.list('following');
    expect(page.list).toHaveLength(3);
    expect(page.hasMore).toBe(false);
  });
});
