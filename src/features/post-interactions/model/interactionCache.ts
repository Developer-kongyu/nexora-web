import type { QueryClient } from '@tanstack/react-query';
import { communityKeys } from '@/domains/communities';
import { feedKeys } from '@/domains/feed';
import { libraryKeys } from '@/domains/library';
import { postKeys } from '@/domains/posts';
import { searchKeys } from '@/domains/search';
import { userKeys } from '@/domains/users';

/**
 * Post copies live under several query keys. Refetch mounted surfaces and mark
 * inactive copies stale, including list membership changed by repost/bookmark.
 * Drafts and unrelated profile/community management queries stay untouched.
 */
export function invalidateInteractionQueries(client: QueryClient) {
  return client.invalidateQueries({
    predicate: ({ queryKey }) => {
      const [root, section, child] = queryKey;
      return (
        (root === postKeys.all[0] && section !== 'drafts') ||
        root === feedKeys.all[0] ||
        root === searchKeys.all[0] ||
        root === libraryKeys.bookmarks[0] ||
        root === libraryKeys.history[0] ||
        (root === libraryKeys.contentCenter[0] && section === 'published') ||
        (root === userKeys.all[0] && child === 'posts') ||
        (root === communityKeys.all[0] &&
          (section === 'detail' || queryKey.includes('pinned-posts')))
      );
    },
  });
}
