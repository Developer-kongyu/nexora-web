import type { PostDraftListItemView } from '../model/types';

export function getPostDraftDisplayTitle(
  draft: Pick<PostDraftListItemView, 'bodyTextPreview'>,
): string {
  return draft.bodyTextPreview?.trim() || '未命名草稿';
}
