const POST_QUERY_ROOT = ['posts'] as const;
const POST_DRAFT_QUERY_ROOT = [...POST_QUERY_ROOT, 'drafts'] as const;

export const postKeys = {
  all: POST_QUERY_ROOT,
  detail: (postId: string) => [...POST_QUERY_ROOT, 'detail', postId] as const,
  replies: (postId: string) => [...POST_QUERY_ROOT, 'replies', postId] as const,
  drafts: POST_DRAFT_QUERY_ROOT,
  draftDetail: (draftId: string) => [...POST_DRAFT_QUERY_ROOT, 'detail', draftId] as const,
};
