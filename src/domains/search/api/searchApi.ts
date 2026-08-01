import { apiClient } from '@/shared/api/client';
import { appendQuery } from '@/shared/api/query';
import type { SearchResult, SearchTab } from '../model/types';
export const searchApi = {
  search: (query: string, tab: SearchTab, sort: string, signal?: AbortSignal) =>
    apiClient.request<SearchResult>({
      path: appendQuery('/api/search', { q: query, tab, sort }),
      auth: false,
      signal,
    }),
};
