import { http } from 'msw';
import { ok } from './http';
import { fixtureState } from '../state/fixtures.state';
import { communitiesState } from '../state/communities.state';
import type { UserPublicCardView } from '@/domains/communities/model';
import { postsState } from '../state/posts.state';

export const searchHandlers = [
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase() || '';
    const tab = url.searchParams.get('tab') ?? 'posts';
    if (tab === 'users') {
      return ok({
        currentTab: 'users' as const,
        list: fixtureState.users
          .filter((user) => user.displayName.toLowerCase().includes(q) || !q)
          .map((user) => communitiesState.mockUserPublicCard(user.id))
          .filter((user): user is UserPublicCardView => user !== null),
        nextCursor: null,
      });
    }
    if (tab === 'communities') {
      return ok({
        currentTab: 'communities' as const,
        list: communitiesState
          .allCommunitySummaries()
          .filter((community) => community.name.toLowerCase().includes(q) || !q)
          .map(communitiesState.mockCommunityCard),
        nextCursor: null,
      });
    }
    return ok({
      currentTab: 'posts' as const,
      list: fixtureState.posts
        .filter((post) => post.content.toLowerCase().includes(q) || !q)
        .map((post) => postsState.requiredMockPostCard(post.id)),
      nextCursor: null,
    });
  }),
];
