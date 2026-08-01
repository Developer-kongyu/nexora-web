import type {
  PostCardBriefView,
  PostDeletedListItemView,
  PostDraftListItemView,
  PostDeleteOutcome,
} from '@/domains/posts/model/types';
import type { CursorPageView } from '@/shared/api/pagination';

export type BookmarkCollectionKind = 'DEFAULT' | 'CUSTOM';
export type BookmarkCollectionVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

export interface BookmarkCollectionSummary {
  collectionId: string;
  name: string;
  kind: BookmarkCollectionKind;
  visibility: BookmarkCollectionVisibility;
  itemCount: number;
  updatedAtIso: string;
  lastItemAddedAtIso: string | null;
}

export interface ListOwnBookmarkCollectionsResult {
  list: BookmarkCollectionSummary[];
}

export type BookmarkSourceScene =
  | 'POST_DETAIL'
  | 'FEED_CARD'
  | 'SEARCH_RESULT'
  | 'PROFILE_POST'
  | 'COMMUNITY_POST'
  | 'NOTIFICATION_JUMP';

export type BookmarkPermissionPlaceholderReasonCode =
  | 'DENY_POST_NOT_FOUND'
  | 'DENY_POST_STATUS_INVALID'
  | 'DENY_POST_FOLLOWERS_ONLY'
  | 'DENY_POST_PRIVATE'
  | 'DENY_TARGET_STATUS_INVALID'
  | 'DENY_COMMUNITY_NOT_FOUND'
  | 'DENY_COMMUNITY_STATUS_INVALID'
  | 'DENY_COMMUNITY_ARCHIVED'
  | 'DENY_COMMUNITY_BANNED'
  | 'DENY_COMMUNITY_JOIN_PENDING'
  | 'DENY_COMMUNITY_INVITE_ONLY'
  | 'DENY_COMMUNITY_MEMBERSHIP_REQUIRED'
  | 'DENY_COMMUNITY_ROLE_TOO_LOW'
  | 'DENY_COMMUNITY_RULES_NOT_ACCEPTED'
  | 'DENY_COMMUNITY_POST_MUST_BE_PUBLIC';

export type BookmarkPlaceholderReasonCode =
  | BookmarkPermissionPlaceholderReasonCode
  | 'CARD_HYDRATION_UNAVAILABLE';

interface BookmarkCollectionItemBase {
  bookmarkItemId: string;
  postId: string;
  bookmarkCollectionId: string;
  savedAtIso: string;
}

export type BookmarkCollectionItemCardView =
  | (BookmarkCollectionItemBase & {
      itemState: 'ACTIVE';
      placeholderReasonCode: null;
      postCard: PostCardBriefView;
    })
  | (BookmarkCollectionItemBase & {
      itemState: 'PLACEHOLDER';
      placeholderReasonCode: BookmarkPlaceholderReasonCode;
      postCard: null;
    });

export type BookmarkCollectionItemsPage = CursorPageView<BookmarkCollectionItemCardView>;

export interface SavePostBookmarkInput {
  targetCollectionId?: string | null;
  sourceScene?: BookmarkSourceScene | null;
}

export interface SavePostBookmarkResult {
  bookmarkItemId: string;
  bookmarkCollectionId: string;
  action: 'ADDED' | 'UNCHANGED' | 'MOVED' | 'RESTORED';
  savedAtIso: string;
}

export interface RemovePostBookmarkResult {
  bookmarkItemId: string | null;
  bookmarkCollectionId: string | null;
  removed: boolean;
}

export interface DeleteBookmarkCollectionResult {
  deleted: true;
  fallbackCollectionId: string;
  movedItemCount: number;
}

export interface MoveBookmarkCollectionItemsInput {
  sourceCollectionId: string;
  targetCollectionId: string;
  itemIds: string[];
}

export interface MoveBookmarkCollectionItemsResult {
  sourceCollectionId: string;
  targetCollectionId: string;
  requestedCount: number;
  dedupedCount: number;
  processedCount: number;
  movedCount: number;
  skippedCount: number;
  movedItemIds: string[];
  skippedItemIds: string[];
}

export interface RemoveBookmarkCollectionItemsInput {
  itemIds: string[];
}

export interface RemoveBookmarkCollectionItemsResult {
  requestedCount: number;
  dedupedCount: number;
  processedCount: number;
  removedCount: number;
  skippedCount: number;
  removedItemIds: string[];
  skippedItemIds: string[];
  removedPostIds: string[];
}

export type ContentCenterPublishedPageDegradedReason =
  | 'OWNER_GATE_SHORT_PAGE'
  | 'CARD_SURFACE_SHORT_PAGE';

export interface ContentCenterPublishedPageView extends CursorPageView<PostCardBriefView> {
  degraded: boolean;
  degradedReasons: ContentCenterPublishedPageDegradedReason[];
  pageMayBeShort: boolean;
  filteredCountHint: number;
}

export type ContentCenterDraftPageView = CursorPageView<PostDraftListItemView>;
export type ContentCenterDeletedPageView = CursorPageView<PostDeletedListItemView>;

export interface BatchDeleteOwnDraftResultItem {
  draftId: string;
  succeeded: boolean;
  outcome: PostDeleteOutcome | null;
  errorCode:
    | 'DRAFT_NOT_FOUND'
    | 'DRAFT_BUSY'
    | 'DRAFT_ALREADY_PUBLISHED'
    | 'DRAFT_STATE_INCONSISTENT'
    | null;
  errorMessage: string | null;
}

export interface BatchDeleteOwnDraftsResult {
  results: BatchDeleteOwnDraftResultItem[];
}

export type BrowseHistorySourceScene =
  | 'POST_DETAIL'
  | 'SEARCH_RESULT'
  | 'COMMUNITY_POST'
  | 'PROFILE_POST'
  | 'NOTIFICATION_JUMP';

export type BrowseHistorySourceModule =
  | 'POST'
  | 'SEARCH'
  | 'COMMUNITY'
  | 'PROFILE'
  | 'NOTIFICATION';

interface PostBrowseHistoryItemBase {
  postId: string;
  lastViewedAtIso: string;
  viewCount: number;
  sourceScene: BrowseHistorySourceScene | null;
  sourceModule: BrowseHistorySourceModule | null;
}

export type PostBrowseHistoryItemView =
  | (PostBrowseHistoryItemBase & {
      itemState: 'ACTIVE';
      placeholderReasonCode: null;
      postCard: PostCardBriefView;
    })
  | (PostBrowseHistoryItemBase & {
      itemState: 'PLACEHOLDER';
      placeholderReasonCode: BookmarkPlaceholderReasonCode;
      postCard: null;
    });

export type PostBrowseHistoryPageView = CursorPageView<PostBrowseHistoryItemView>;

export interface DeletePostBrowseHistoryItemResult {
  deleted: boolean;
}

export interface ClearPostBrowseHistoryResult {
  clearedCount: number;
}
