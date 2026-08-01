import type { CursorPage } from '@/shared/api/pagination';
import type { PostViewModel } from '@/domains/posts/model/types';
export type FeedPage = CursorPage<PostViewModel>;
