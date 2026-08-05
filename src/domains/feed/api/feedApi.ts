import { postsApi } from '@/domains/posts';
import { mergeRepostSource } from '@/domains/posts/lib/postCardAdapter';
import type { PostViewModel } from '@/domains/posts/model/types';
import type { FeedPage } from '../model/types';
import { apiClient } from '@/shared/api/client';
import { appendQuery } from '@/shared/api/query';
import { feedResponseToPage } from '../lib/feedAdapter';
import type { ExplorePostTab, FeedTab } from '../model/queryKeys';
import type {
  ExploreCommunitiesResponseDto,
  ExploreCommunityBucketKind,
  ExploreTopicBucketKind,
  ExploreTopicsResponseDto,
  FeedRefreshMode,
  FeedResponseDto,
} from '../model/types';

async function hydrateFeedReposts(
  response: FeedResponseDto,
  signal?: AbortSignal,
): Promise<FeedPage> {
  const page = feedResponseToPage(response);
  const sourcePostIds = [
    ...new Set(
      response.list
        .filter((item) => item.postId !== item.dedupePostId)
        .map((item) => item.dedupePostId),
    ),
  ];
  if (sourcePostIds.length === 0) return page;

  const sourceById = new Map<string, PostViewModel>();
  await Promise.all(
    sourcePostIds.map(async (sourcePostId) => {
      try {
        sourceById.set(sourcePostId, await postsApi.detail(sourcePostId, signal));
      } catch (error) {
        if (signal?.aborted) throw error;
      }
    }),
  );

  return {
    ...page,
    list: page.list.map((post, index) => {
      const item = response.list[index];
      const source = item ? sourceById.get(item.dedupePostId) : undefined;
      if (source && post.relation?.kind === 'REPOST') {
        return mergeRepostSource(post, source);
      }
      return post.relation?.kind === 'REPOST'
        ? {
            ...post,
            content: '\u539f\u5e16\u5b50\u5f53\u524d\u4e0d\u53ef\u7528',
          }
        : post;
    }),
  };
}

export const feedApi = {
  list: async (
    tab: FeedTab,
    cursor?: string,
    signal?: AbortSignal,
    refreshMode?: FeedRefreshMode,
  ) => {
    const endpoint = tab === 'following' ? '/api/feeds/following' : '/api/feeds/for-you';
    const response = await apiClient.request<FeedResponseDto>({
      path: appendQuery(endpoint, { cursor, pageSize: 20, refreshMode }),
      signal,
    });
    return hydrateFeedReposts(response, signal);
  },
  explore: async (
    cursor?: string,
    signal?: AbortSignal,
    tab: ExplorePostTab = 'HOT',
  ) => {
    const response = await apiClient.request<FeedResponseDto>({
      path: appendQuery('/api/feeds/explore/posts', { cursor, pageSize: 20, tab }),
      signal,
    });
    return hydrateFeedReposts(response, signal);
  },
  exploreTopics: (
    bucketKind: ExploreTopicBucketKind = 'HOT_24H',
    limit = 8,
    signal?: AbortSignal,
  ) =>
    apiClient.request<ExploreTopicsResponseDto>({
      path: appendQuery('/api/feeds/explore/topics', { bucketKind, limit }),
      auth: false,
      signal,
    }),
  exploreCommunities: (
    bucketKind: ExploreCommunityBucketKind = 'FEATURED_BY_INTEREST',
    limit = 6,
    signal?: AbortSignal,
  ) =>
    apiClient.request<ExploreCommunitiesResponseDto>({
      path: appendQuery('/api/feeds/explore/communities', { bucketKind, limit }),
      signal,
    }),
};
