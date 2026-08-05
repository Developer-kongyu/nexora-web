import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { feedApi } from '../api/feedApi';
import { mergeRefreshedFeed, type FeedInfiniteData } from '../lib/feedRefresh';
import { feedKeys, type ExplorePostTab, type FeedTab } from '../model/queryKeys';

export function useFeed(tab: FeedTab) {
  const queryClient = useQueryClient();
  const queryKey = feedKeys.list(tab);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => feedApi.list(tab, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
  const refreshMutation = useMutation({
    mutationKey: [...queryKey, 'refresh'],
    mutationFn: () => feedApi.list(tab, undefined, undefined, 'FIRST_PAGE_REBUILD'),
    onSuccess: (refreshedPage) => {
      queryClient.setQueryData<FeedInfiniteData>(queryKey, (current) =>
        mergeRefreshedFeed(current, refreshedPage),
      );
    },
  });

  return {
    ...query,
    refresh: () => refreshMutation.mutateAsync(),
    isRefreshing: refreshMutation.isPending,
  };
}

export function useExploreFeed(tab: ExplorePostTab) {
  return useInfiniteQuery({
    queryKey: feedKeys.explore(tab),
    queryFn: ({ pageParam, signal }) => feedApi.explore(pageParam, signal, tab),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
}
