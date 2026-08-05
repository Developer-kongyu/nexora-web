import type { ContentCenterPublishedPageView } from '@/domains/library';
import { hydratePostCardBrief, type PostViewModel } from '@/domains/posts';

export type HydratedContentCenterPublishedPage = Omit<ContentCenterPublishedPageView, 'list'> & {
  list: PostViewModel[];
};

/** 为内容中心的薄卡片补齐回复目标或转发原帖，单条补全失败时保留原薄卡片。 */
export async function hydrateContentCenterPublishedPage(
  page: ContentCenterPublishedPageView,
  signal?: AbortSignal,
): Promise<HydratedContentCenterPublishedPage> {
  return {
    ...page,
    list: await Promise.all(page.list.map((card) => hydratePostCardBrief(card, 'profile', signal))),
  };
}
