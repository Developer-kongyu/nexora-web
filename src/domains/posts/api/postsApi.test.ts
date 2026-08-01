import { createTextEngagementInput, postsApi } from '@/domains/posts';

describe('postsApi comment contract', () => {
  it('builds the canonical text-only engagement payload', () => {
    expect(createTextEngagementInput('  一条评论  ')).toEqual({
      bodyText: '  一条评论  ',
      mediaItems: [],
      entityRanges: [],
      linkUrl: null,
      linkCardDisabled: false,
      composerMeta: {
        editorKind: 'TEXTAREA',
        textIndexUnit: 'UTF16_CODE_UNIT',
        normalizationVersion: 'POST_TEXT_NORMALIZATION_V1',
      },
    });
  });

  it('lists root comments and preserves tombstones', async () => {
    const page = await postsApi.listReplies('post-1', { limit: 20 });

    expect(page.list.some((item) => item.tombstone?.state === 'DELETED')).toBe(true);
    expect(page.degraded).toBe(true);
    expect(page.degradedReasons).toContain('REPLY_TOMBSTONE_EXPOSED');
    expect(page.filteredCountHint).toBe(0);
  });

  it('creates, replies to, and deletes a comment through the public routes', async () => {
    const created = await postsApi.createComment(
      'post-1',
      createTextEngagementInput('新建根评论'),
    );

    expect(created.comment.parentCommentId).toBeNull();
    expect(created.comment.topLevelCommentId).toBeNull();
    expect(created.comment.status).toBe('ACTIVE');
    expect(created.derivedPostPublish.publishState).toBe('PUBLISHED');

    const reply = await postsApi.replyComment(
      created.comment.commentId,
      createTextEngagementInput('楼中楼回复'),
    );

    expect(reply.comment.parentCommentId).toBe(created.comment.commentId);
    expect(reply.comment.topLevelCommentId).toBe(created.comment.commentId);
    expect(reply.comment.depth).toBe(1);

    const deleted = await postsApi.deleteComment(created.comment.commentId);
    expect(deleted).toMatchObject({
      deleted: true,
      noOp: false,
      outcome: 'DELETED_NOW',
    });

    const refreshed = await postsApi.listReplies('post-1', { limit: 20 });
    const deletedItem = refreshed.list.find(
      (item) => item.relation.commentId === created.comment.commentId,
    );
    expect(deletedItem?.postCard).toBeNull();
    expect(deletedItem?.tombstone).toEqual({ state: 'DELETED' });
  });
});
