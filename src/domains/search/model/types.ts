import type { CursorPage } from '@/shared/api/pagination';
import type { PostViewModel } from '@/domains/posts/model/types';
import type { UserSummary } from '@/domains/users/model/types';
import type { CommunitySummary } from '@/domains/communities/model/types';

export interface SearchResult {
  posts: CursorPage<PostViewModel>;
  users: CursorPage<UserSummary>;
  communities: CursorPage<CommunitySummary>;
}

export type SearchTab = 'posts' | 'users' | 'communities';
export type SearchSort = 'relevance' | 'latest';
