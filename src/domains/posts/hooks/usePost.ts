import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedKeys } from '@/domains/feed/model/queryKeys';
import { postsApi } from '../api/postsApi';
import { postKeys } from '../model/queryKeys';
import type {
  PostComposeInput,
  PublishPostDirectInput,
  PublishPostFromDraftInput,
} from '../model/types';

export function usePost(postId: string) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: ({ signal }) => postsApi.detail(postId, signal),
    enabled: Boolean(postId),
  });
}

export function usePostDraft(draftId: string | undefined) {
  return useQuery({
    queryKey: postKeys.draftDetail(draftId ?? ''),
    queryFn: ({ signal }) => postsApi.draftDetail(draftId ?? '', signal),
    enabled: Boolean(draftId),
  });
}

function useInvalidateDraftQueries() {
  const client = useQueryClient();
  return async (draftId?: string) => {
    await client.invalidateQueries({ queryKey: postKeys.drafts });
    if (draftId) {
      await client.invalidateQueries({ queryKey: postKeys.draftDetail(draftId) });
    }
  };
}

export function useCreatePostDraft() {
  const invalidateDraftQueries = useInvalidateDraftQueries();
  return useMutation({
    mutationFn: (compose: PostComposeInput) => postsApi.createDraft(compose),
    onSuccess: (result) => invalidateDraftQueries(result.draftId),
  });
}

export interface SavePostDraftVariables {
  draftId: string;
  draftVersion: number;
  compose: PostComposeInput;
}

export function useAutosavePostDraft() {
  const invalidateDraftQueries = useInvalidateDraftQueries();
  return useMutation({
    mutationFn: ({ draftId, draftVersion, compose }: SavePostDraftVariables) =>
      postsApi.autosaveDraft(draftId, draftVersion, compose),
    onSuccess: (result) => invalidateDraftQueries(result.draftId),
  });
}

export function useSavePostDraft() {
  const invalidateDraftQueries = useInvalidateDraftQueries();
  return useMutation({
    mutationFn: ({ draftId, draftVersion, compose }: SavePostDraftVariables) =>
      postsApi.saveDraft(draftId, draftVersion, compose),
    onSuccess: (result) => invalidateDraftQueries(result.draftId),
  });
}

export function usePublishPostDraft() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      draftId,
      input,
    }: {
      draftId: string;
      input?: PublishPostFromDraftInput;
    }) => postsApi.publishDraft(draftId, input),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: feedKeys.all }),
        client.invalidateQueries({ queryKey: postKeys.drafts }),
        client.invalidateQueries({ queryKey: postKeys.draftDetail(result.draftId) }),
      ]);
    },
  });
}

export function usePublishPost() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: PublishPostDirectInput) => postsApi.publish(input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: feedKeys.all }),
        client.invalidateQueries({ queryKey: postKeys.drafts }),
      ]);
    },
  });
}
