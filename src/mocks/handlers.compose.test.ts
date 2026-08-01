import { mediaApi } from '@/domains/media/api/mediaApi';
import { MEDIA_POST_VIDEO_MAX_BYTES } from '@/domains/media/model/constraints';
import { postsApi } from '@/domains/posts/api/postsApi';
import { buildPostComposeInput } from '@/domains/posts/lib/compose';

function compose(bodyText: string) {
  return buildPostComposeInput({
    bodyText,
    mediaAssetIds: [],
    visibility: 'FOLLOWERS',
    commentPermission: 'FOLLOWING',
    quotePermission: 'NO_ONE',
    repostPermission: 'EVERYONE',
  });
}

describe('default mock compose handlers', () => {
  it('keeps draft detail, list projection, versions, conflicts, and publish removal consistent', async () => {
    const created = await postsApi.createDraft(compose('第一版草稿'), 'mock-draft-create');

    try {
      const detail = await postsApi.draftDetail(created.draftId);
      expect(detail).toMatchObject({
        draftId: created.draftId,
        draftVersion: 1,
        composeSnapshot: {
          bodyText: '第一版草稿',
          bodyTextNormalized: '第一版草稿',
        },
      });

      const autosaved = await postsApi.autosaveDraft(
        created.draftId,
        detail.draftVersion,
        compose('第二版草稿'),
      );
      expect(autosaved).toMatchObject({ saved: true, reason: 'UPDATED', draftVersion: 2 });

      await expect(
        postsApi.saveDraft(created.draftId, detail.draftVersion, compose('过期写入')),
      ).rejects.toMatchObject({
        httpStatus: 409,
        code: 'POST_DRAFT_VERSION_CONFLICT',
      });

      const saved = await postsApi.saveDraft(
        created.draftId,
        autosaved.draftVersion,
        compose('第三版草稿'),
      );
      expect(saved).toMatchObject({ saved: true, reason: 'UPDATED', draftVersion: 3 });

      const listed = await postsApi.drafts({ limit: 100 });
      expect(listed.list.find((item) => item.draftId === created.draftId)).toMatchObject({
        draftVersion: 3,
        bodyTextPreview: '第三版草稿',
      });

      const published = await postsApi.publishDraft(
        created.draftId,
        { allowWaitingMediaPublish: false },
        'mock-draft-publish',
      );
      expect(published).toMatchObject({
        draftId: created.draftId,
        publishState: 'PUBLISHED',
        publishMode: 'IMMEDIATE',
        pendingMediaAssetIds: [],
      });
      await expect(postsApi.draftDetail(created.draftId)).rejects.toMatchObject({
        httpStatus: 404,
        code: 'POST_DRAFT_NOT_FOUND',
      });
    } finally {
      await postsApi.deleteDraft(created.draftId).catch(() => undefined);
    }
  });

  it('accepts a post video upload session and preserves VIDEO through confirmation', async () => {
    const clientUploadId = `video-${crypto.randomUUID()}`;
    const session = await mediaApi.createUploadSessions({
      items: [
        {
          clientUploadId,
          scene: 'POST_COMPOSE',
          fileName: 'launch.mp4',
          contentType: 'video/mp4',
          sizeInBytes: '4096',
          assetKind: 'VIDEO',
        },
      ],
    });
    const item = session.results[0];
    expect(item).toMatchObject({
      clientUploadId,
      scene: 'POST_COMPOSE',
      assetKind: 'VIDEO',
      resultType: 'CREATED',
    });
    if (!item || item.resultType === 'REJECTED') throw new Error('视频上传会话创建失败');

    const confirmation = {
      mediaAssetId: item.mediaAssetId,
      uploadSessionRevision: item.ticket.uploadSessionRevision,
      clientUploadId,
      clientSha256: null,
      contentType: 'video/mp4',
      sizeInBytes: '4096',
      originWidth: null,
      originHeight: null,
      durationMs: 12_000,
    };
    const first = await mediaApi.confirmUploaded(confirmation);
    const ready = await mediaApi.confirmUploaded(confirmation);

    expect(first).toMatchObject({
      assetKind: 'VIDEO',
      currentAssetStatus: 'UPLOADED',
      processingAction: 'VIDEO_TRANSCODE_ENQUEUED',
    });
    expect(ready).toMatchObject({
      assetKind: 'VIDEO',
      currentAssetStatus: 'READY',
    });

    const oversized = await mediaApi.createUploadSessions({
      items: [
        {
          clientUploadId: `oversized-${crypto.randomUUID()}`,
          scene: 'POST_COMPOSE',
          fileName: 'oversized.mp4',
          contentType: 'video/mp4',
          sizeInBytes: String(MEDIA_POST_VIDEO_MAX_BYTES + 1),
          assetKind: 'VIDEO',
        },
      ],
    });
    expect(oversized.results[0]).toMatchObject({
      resultType: 'REJECTED',
      errorCode: 'MEDIA_ASSET_FILE_SIZE_INVALID',
    });
  });

  it('publishes the canonical body-only input and exposes the created post detail', async () => {
    const result = await postsApi.publish(
      { ...compose('直接发布合同'), allowWaitingMediaPublish: false },
      'mock-direct-publish',
    );

    expect(result).toMatchObject({
      publishState: 'PUBLISHED',
      publishMode: 'IMMEDIATE',
      pendingMediaAssetIds: [],
    });
    await expect(postsApi.detail(result.postId)).resolves.toMatchObject({
      id: result.postId,
      content: '直接发布合同',
    });
  });
});
