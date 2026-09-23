import type { PostDraftDetailView, PostPublishState } from '@/domains/posts/model';

interface ComposerCallbacks {
  onDraftSaved?: (draftId: string) => void;
  onPublished?: (result: { postId: string; publishState: PostPublishState }) => void;
}

export interface ComposeEditorProps extends ComposerCallbacks {
  draftId?: string;
  initialCommunityId?: string;
  initialQuotePostId?: string | null;
}

export interface ComposerOptions extends ComposerCallbacks {
  initialDraft: PostDraftDetailView | null;
  initialCommunityId: string;
  initialQuotePostId: string | null;
}
