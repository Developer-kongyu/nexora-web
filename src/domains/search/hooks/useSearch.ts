import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api/searchApi';
import { searchKeys } from '../model/queryKeys';
import type { SearchTab } from '../model/types';
export function useSearch(query: string, tab: SearchTab, sort = 'relevance') {
  return useQuery({
    queryKey: searchKeys.results(query, tab, sort),
    queryFn: ({ signal }) => searchApi.search(query, tab, sort, signal),
    enabled: query.trim().length > 0,
  });
}
