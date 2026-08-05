import { postCardBriefToViewModel } from '@/domains/posts/lib/postCardAdapter';
import type {
  CommunityCardBriefView,
  CommunityDetail,
  CommunityDetailView,
  CommunitySummary,
} from '../model/types';

export interface CommunityMembershipStateDto {
  communityId: string;
  joined: boolean;
  pending: boolean;
}

export function communityCardToSummary(
  card: CommunityCardBriefView,
  membership: CommunityMembershipStateDto | null = null,
): CommunitySummary {
  return {
    id: card.communityId,
    slug: card.slug,
    name: card.name,
    description: card.description ?? '',
    avatarUrl: card.avatarUrl,
    membersCount: card.memberCount,
    joined: membership?.joined ?? false,
  };
}

export function communityDetailToLegacy(view: CommunityDetailView): CommunityDetail {
  const card = view.community;
  return {
    ...communityCardToSummary(
      card,
      view.viewerContext
        ? {
            communityId: card.communityId,
            joined: view.viewerContext.actorMembershipStatus === 'ACTIVE',
            pending: view.viewerContext.actorMembershipStatus === 'PENDING',
          }
        : null,
    ),
    coverUrl: card.coverUrl,
    rules: [...view.rules]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((rule) => rule.content),
    visibility: card.visibility === 'PRIVATE' ? 'private' : 'public',
    joinMode: card.joinPolicy === 'OPEN' ? 'open' : 'approval',
    posts: view.pinnedPosts.map((post) => postCardBriefToViewModel(post, 'community')),
  };
}
