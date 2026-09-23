import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedKeys } from '@/domains/feed/model';
import { postKeys, postsApi, type PostComposeInput } from '@/domains/posts';

type PublishVariables = { draftId: string } | { compose: PostComposeInput };

/** A single submission lifecycle owns both publish routes and their cache effects. */
export function usePublishPost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables: PublishVariables) =>
      'draftId' in variables
        ? postsApi.publishDraft(variables.draftId, { allowWaitingMediaPublish: true })
        : postsApi.publish({ ...variables.compose, allowWaitingMediaPublish: true }),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: feedKeys.all }),
        client.invalidateQueries({ queryKey: postKeys.drafts }),
        ...('draftId' in variables
          ? [client.invalidateQueries({ queryKey: postKeys.draftDetail(variables.draftId) })]
          : []),
      ]);
    },
  });
}
