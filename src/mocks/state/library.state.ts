import { fixtureState } from './fixtures.state';
import type {
  BookmarkCollectionSummary,
  BookmarkCollectionItemCardView,
  PostBrowseHistoryItemView,
} from '@/domains/library/model';
import { postsState } from './posts.state';
import type { PostCardBriefView } from '@/domains/posts/model';

function createLibraryState() {
  const MOCK_DEFAULT_BOOKMARK_COLLECTION_ID = 'bookmark-default';

  const MOCK_DESIGN_BOOKMARK_COLLECTION_ID = 'bookmark-design';

  const MOCK_TRAVEL_BOOKMARK_COLLECTION_ID = 'bookmark-travel';

  let mockBookmarkCollections: BookmarkCollectionSummary[] = [
    {
      collectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
      name: '全部收藏',
      kind: 'DEFAULT',
      visibility: 'PRIVATE',
      itemCount: 0,
      updatedAtIso: '2026-07-27T09:30:00.000Z',
      lastItemAddedAtIso: '2026-07-27T09:30:00.000Z',
    },
    {
      collectionId: MOCK_DESIGN_BOOKMARK_COLLECTION_ID,
      name: '产品设计',
      kind: 'CUSTOM',
      visibility: 'PRIVATE',
      itemCount: 0,
      updatedAtIso: '2026-07-26T10:00:00.000Z',
      lastItemAddedAtIso: '2026-07-26T10:00:00.000Z',
    },
    {
      collectionId: MOCK_TRAVEL_BOOKMARK_COLLECTION_ID,
      name: '旅行灵感',
      kind: 'CUSTOM',
      visibility: 'FOLLOWERS',
      itemCount: 0,
      updatedAtIso: '2026-07-20T12:00:00.000Z',
      lastItemAddedAtIso: null,
    },
  ];

  let mockBookmarkItems: BookmarkCollectionItemCardView[] = [
    {
      bookmarkItemId: 'bookmark-item-1',
      postId: 'post-1',
      bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
      savedAtIso: '2026-07-27T09:30:00.000Z',
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard: postsState.requiredMockPostCard('post-1'),
    },
    {
      bookmarkItemId: 'bookmark-item-2',
      postId: 'post-2',
      bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
      savedAtIso: '2026-07-25T07:20:00.000Z',
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard: postsState.requiredMockPostCard('post-2'),
    },
    {
      bookmarkItemId: 'bookmark-item-missing',
      postId: 'post-removed',
      bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
      savedAtIso: '2026-07-22T05:10:00.000Z',
      itemState: 'PLACEHOLDER',
      placeholderReasonCode: 'DENY_POST_NOT_FOUND',
      postCard: null,
    },
    {
      bookmarkItemId: 'bookmark-item-design-2',
      postId: 'post-3',
      bookmarkCollectionId: MOCK_DESIGN_BOOKMARK_COLLECTION_ID,
      savedAtIso: '2026-07-24T08:00:00.000Z',
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard: postsState.requiredMockPostCard('post-3'),
    },
  ];

  let mockBrowseHistory: PostBrowseHistoryItemView[] = [
    {
      postId: 'post-1',
      lastViewedAtIso: '2026-07-28T01:30:00.000Z',
      viewCount: 3,
      sourceScene: 'POST_DETAIL',
      sourceModule: 'POST',
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard: postsState.requiredMockPostCard('post-1'),
    },
    {
      postId: 'post-3',
      lastViewedAtIso: '2026-07-27T13:02:00.000Z',
      viewCount: 1,
      sourceScene: 'SEARCH_RESULT',
      sourceModule: 'SEARCH',
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard: postsState.requiredMockPostCard('post-3'),
    },
    {
      postId: 'post-history-unavailable',
      lastViewedAtIso: '2026-07-26T14:18:00.000Z',
      viewCount: 2,
      sourceScene: 'COMMUNITY_POST',
      sourceModule: 'COMMUNITY',
      itemState: 'PLACEHOLDER',
      placeholderReasonCode: 'DENY_COMMUNITY_MEMBERSHIP_REQUIRED',
      postCard: null,
    },
  ];

  function refreshMockBookmarkCollectionCounts(adjustInteractionCounters = true): void {
    for (const post of fixtureState.posts) {
      const bookmarked = mockBookmarkItems.some(
        (item) => item.postId === post.id && item.itemState === 'ACTIVE',
      );
      postsState.updateMockPostInteraction(
        post.id,
        'bookmark',
        bookmarked,
        adjustInteractionCounters,
      );
    }
    mockBookmarkCollections = mockBookmarkCollections.map((collection) => {
      const items = mockBookmarkItems.filter(
        (item) => item.bookmarkCollectionId === collection.collectionId,
      );
      return {
        ...collection,
        itemCount: items.length,
        lastItemAddedAtIso: items[0]?.savedAtIso ?? null,
      };
    });
  }

  function findMockBookmarkCollection(collectionId: string): BookmarkCollectionSummary | null {
    return (
      mockBookmarkCollections.find((collection) => collection.collectionId === collectionId) ?? null
    );
  }

  function cloneMockPostCardForBookmark(
    postId: string,
    collectionId: string,
  ): PostCardBriefView | null {
    const card = postsState.mockPostCard(postId);
    if (!card) return null;
    return {
      ...card,
      interactionSummary: card.interactionSummary
        ? {
            ...card.interactionSummary,
            viewerState: card.interactionSummary.viewerState
              ? {
                  ...card.interactionSummary.viewerState,
                  bookmarked: true,
                  bookmarkCollectionId: collectionId,
                }
              : null,
          }
        : null,
    };
  }

  refreshMockBookmarkCollectionCounts(false);
  return {
    MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
    MOCK_DESIGN_BOOKMARK_COLLECTION_ID,
    MOCK_TRAVEL_BOOKMARK_COLLECTION_ID,
    get mockBookmarkCollections() {
      return mockBookmarkCollections;
    },
    set mockBookmarkCollections(value: typeof mockBookmarkCollections) {
      mockBookmarkCollections = value;
    },
    get mockBookmarkItems() {
      return mockBookmarkItems;
    },
    set mockBookmarkItems(value: typeof mockBookmarkItems) {
      mockBookmarkItems = value;
    },
    get mockBrowseHistory() {
      return mockBrowseHistory;
    },
    set mockBrowseHistory(value: typeof mockBrowseHistory) {
      mockBrowseHistory = value;
    },
    refreshMockBookmarkCollectionCounts,
    findMockBookmarkCollection,
    cloneMockPostCardForBookmark,
  };
}

export let libraryState = createLibraryState();

export function resetLibraryState(): void {
  libraryState = createLibraryState();
}
