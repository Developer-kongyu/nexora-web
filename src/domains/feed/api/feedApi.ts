import { apiClient } from '@/shared/api/client';
import { buildCursorQuery } from '@/shared/api/pagination';
import type { FeedTab } from '../model/queryKeys';
import type { FeedPage } from '../model/types';

export const feedApi = {
  list: (tab: FeedTab, cursor?: string, signal?: AbortSignal) => {
    const endpoint = tab === 'following' ? '/api/feeds/following' : '/api/feeds/for-you';
    return apiClient.request<FeedPage>({
      path: `${endpoint}${buildCursorQuery({ cursor })}`,
      signal,
    });
  },
  explore: (cursor?: string, signal?: AbortSignal) =>
    apiClient.request<FeedPage>({
      path: `/api/feeds/explore/posts${buildCursorQuery({ cursor })}`,
      auth: false,
      signal,
    }),
};
