import { describe, expect, it } from 'vitest';
import { summarizeBatchDeleteDrafts } from './draftBatch';

describe('summarizeBatchDeleteDrafts', () => {
  it('treats missing, rejected and unsuccessful results as failures', () => {
    const summary = summarizeBatchDeleteDrafts(
      {
        results: [
          {
            draftId: 'draft-a',
            succeeded: true,
            outcome: 'DELETED_NOW',
            errorCode: null,
            errorMessage: null,
          },
          {
            draftId: 'draft-b',
            succeeded: false,
            outcome: null,
            errorCode: 'DRAFT_BUSY',
            errorMessage: 'busy',
          },
        ],
      },
      ['draft-a', 'draft-b', 'draft-missing'],
    );

    expect([...summary.succeededIds]).toEqual(['draft-a']);
    expect(summary.failedIds).toEqual(['draft-b', 'draft-missing']);
  });
});
