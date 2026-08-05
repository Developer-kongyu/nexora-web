import { apiClient } from '@/shared/api/client';
import { appendQuery } from '@/shared/api/query';
import { communityCardToSummary } from '@/domains/communities/lib/communityAdapter';
import type { CommunityCardBriefView, UserPublicCardView } from '@/domains/communities/model/types';
import { postsApi } from '@/domains/posts/api/postsApi';
import { postCardBriefToViewModel } from '@/domains/posts/lib/postCardAdapter';
import type { PostCardBriefView } from '@/domains/posts/model/types';
import type { CursorPage } from '@/shared/api/pagination';
import type { SearchResult, SearchSort, SearchTab } from '../model/types';

interface SearchBaseDto {
  currentTab: SearchTab;
  nextCursor: string | null;
}

type SearchResponseDto =
  | (SearchBaseDto & { currentTab: 'posts'; list: PostCardBriefView[] })
  | (SearchBaseDto & { currentTab: 'users'; list: UserPublicCardView[] })
  | (SearchBaseDto & { currentTab: 'communities'; list: CommunityCardBriefView[] });

function emptyPage<T>(): CursorPage<T> {
  return { list: [], nextCursor: null, hasMore: false };
}

async function hydrateSearchPost(card: PostCardBriefView, signal?: AbortSignal) {
  const fallback = postCardBriefToViewModel(card, 'search');
  if (card.postKind !== 'REPLY' && card.postKind !== 'REPOST') return fallback;

  try {
    return {
      ...(await postsApi.detail(card.postId, signal)),
      variant: 'search' as const,
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return fallback;
  }
}

async function toResult(response: SearchResponseDto, signal?: AbortSignal): Promise<SearchResult> {
  const result: SearchResult = {
    posts: emptyPage(),
    users: emptyPage(),
    communities: emptyPage(),
  };
  const hasMore = response.nextCursor !== null;
  if (response.currentTab === 'posts') {
    result.posts = {
      list: await Promise.all(response.list.map((post) => hydrateSearchPost(post, signal))),
      nextCursor: response.nextCursor,
      hasMore,
    };
  } else if (response.currentTab === 'users') {
    result.users = {
      list: response.list.map((user) => ({
        id: user.userId,
        handle: user.handle,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio ?? undefined,
        followersCount: user.followersCount,
        isFollowing: user.relationship?.following ?? false,
      })),
      nextCursor: response.nextCursor,
      hasMore,
    };
  } else {
    result.communities = {
      list: response.list.map((community) => communityCardToSummary(community)),
      nextCursor: response.nextCursor,
      hasMore,
    };
  }
  return result;
}

export const searchApi = {
  search: async (query: string, tab: SearchTab, sort: SearchSort, signal?: AbortSignal) => {
    const response = await apiClient.request<SearchResponseDto>({
      path: appendQuery('/api/search', { q: query.trim(), tab, sort, pageSize: 20 }),
      signal,
    });
    return toResult(response, signal);
  },
};
