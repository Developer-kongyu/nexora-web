import { useInfiniteQuery } from '@tanstack/react-query';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { feedApi } from '../api/feedApi';
import { feedKeys, type FeedTab } from '../model/queryKeys';

export function useFeed(tab: FeedTab) {
  return useInfiniteQuery({
    queryKey: feedKeys.list(tab),
    queryFn: ({ pageParam, signal }) => feedApi.list(tab, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
}

export function useExploreFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.explore,
    queryFn: ({ pageParam, signal }) => feedApi.explore(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
}
