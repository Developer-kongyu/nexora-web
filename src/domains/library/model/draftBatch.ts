import type { BatchDeleteOwnDraftsResult } from './types';

export interface BatchDeleteDraftsSummary {
  succeededIds: ReadonlySet<string>;
  failedIds: string[];
}

export function summarizeBatchDeleteDrafts(
  result: BatchDeleteOwnDraftsResult,
  requestedIds: readonly string[],
): BatchDeleteDraftsSummary {
  const resultByDraftId = new Map(result.results.map((item) => [item.draftId, item]));
  const succeededIds = new Set(
    requestedIds.filter((draftId) => resultByDraftId.get(draftId)?.succeeded === true),
  );
  return {
    succeededIds,
    failedIds: requestedIds.filter((draftId) => !succeededIds.has(draftId)),
  };
}
