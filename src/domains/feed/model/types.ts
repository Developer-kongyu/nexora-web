import type { MediaAssetKind } from '@/domains/media';
import type { PostViewModel } from '@/domains/posts/model/types';
import type { CursorPage } from '@/shared/api/pagination';

export type FeedPage = CursorPage<PostViewModel>;
export type FeedRefreshMode = 'FIRST_PAGE_REBUILD';

export interface FeedListItemDto {
  postId: string;
  dedupePostId: string;
  publishedAtIso: string;
  author: {
    userId: string;
    displayName: string | null;
    handle: string | null;
    avatarUrl: string | null;
  };
  community: {
    communityId: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    description: string | null;
  } | null;
  summary: { bodyText: string | null; hasImage: boolean; hasVideo: boolean; mediaCount: number };
  mediaBundle: {
    items: Array<{
      slotIndex: number;
      mediaAssetId: string;
      assetKind: MediaAssetKind;
      previewUrl: string | null;
      posterUrl: string | null;
      width: number | null;
      height: number | null;
      durationMs: number | null;
    }>;
    mediaCount: number;
  } | null;
  counters: {
    likeCount: number;
    commentCount: number;
    quoteCount: number;
    repostCount: number;
    bookmarkCount: number;
    impressionCount: number;
    dedupedVideoViewCount: number;
  };
  viewerState: { liked: boolean; reposted: boolean; quoted: boolean; bookmarked: boolean } | null;
}

export interface FeedResponseDto {
  list: FeedListItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ExploreTopicBucketKind = 'HOT_1H' | 'HOT_24H' | 'RISING_24H';

export interface ExploreTrendingTopicDto {
  hashtagText: string;
  hashtagNormalized: string;
  score: number;
  postCount24h: number;
  contributorCount24h: number;
  freshnessBoost: number | null;
  representativePostId: string | null;
  rankPosition: number;
}

export interface ExploreTopicsResponseDto {
  bucketKind: ExploreTopicBucketKind;
  list: ExploreTrendingTopicDto[];
  windowStartedAtIso: string | null;
  windowEndedAtIso: string | null;
  degradedReason: 'SNAPSHOT_NOT_READY' | null;
}

export type ExploreCommunityBucketKind = 'HOT_24H' | 'RISING_7D' | 'FEATURED_BY_INTEREST';

export interface ExploreCommunityCardDto {
  communityId: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  categoryKey: string | null;
  tags: string[];
  memberCount: number;
  postCount: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  joinPolicy: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
}

export interface ExploreCommunityItemDto {
  returnedRankPosition: number;
  snapshotRankPosition: number;
  snapshotScore: number;
  interestTagOverlapScore: number | null;
  memberCountSnapshot: number;
  activePostCount7d: number;
  growthCount7d: number;
  representativePostId: string | null;
  card: ExploreCommunityCardDto;
}

export interface ExploreCommunitiesResponseDto {
  requestedBucketKind: ExploreCommunityBucketKind;
  effectiveBucketKind: Exclude<ExploreCommunityBucketKind, 'FEATURED_BY_INTEREST'>;
  personalizationApplied: boolean;
  personalizationSkippedReason:
    | 'ANONYMOUS'
    | 'OWNER_DEFAULTS'
    | 'PERSONALIZATION_DISABLED'
    | 'COMMUNITY_RECOMMENDATION_DISABLED'
    | 'NO_INTEREST_TAGS'
    | null;
  list: ExploreCommunityItemDto[];
  windowStartedAtIso: string | null;
  windowEndedAtIso: string | null;
  degradedReason: 'SNAPSHOT_NOT_READY' | null;
}
