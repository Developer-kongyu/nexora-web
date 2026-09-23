import { authApi } from '@/domains/auth';
import { communitiesApi } from '@/domains/communities';
import { libraryApi } from '@/domains/library';
import { mediaApi } from '@/domains/media';
import type { CreateMediaUploadSessionsInput } from '@/domains/media/model';
import { notificationsApi } from '@/domains/notifications';
import { permissionsApi } from '@/domains/permissions';
import { buildPostComposeInput, postsApi } from '@/domains/posts';
import { settingsApi } from '@/domains/settings';
import { usersApi } from '@/domains/users';
import { currentUser, posts } from './fixtures';
import { resetMockState } from './state';

async function captureState() {
  return {
    profile: await usersApi.getOwnEditableProfile(),
    relationship: await usersApi.relationship('xiaoming'),
    followers: await usersApi.followers('xiaoming'),
    followRequests: await usersApi.incomingFollowRequests(),
    draft: await postsApi.draftDetail('d-1'),
    drafts: await postsApi.drafts(),
    post: await postsApi.detail('post-1'),
    replies: await postsApi.listReplies('post-1'),
    security: await authApi.accountSecurity(),
    sessions: await authApi.sessions(),
    unread: await notificationsApi.unread(),
    interests: await settingsApi.interests(),
    settings: await settingsApi.overview(),
    collections: await libraryApi.collections(),
    history: await libraryApi.history(),
    community: await communitiesApi.getDetailBySlug('ai-product'),
    policy: await permissionsApi.get(),
  };
}

describe('default mock isolation', () => {
  it('matches static user and draft routes before dynamic detail routes', async () => {
    await expect(usersApi.getCurrentUserCard()).resolves.toMatchObject({
      userId: currentUser.id,
      handle: currentUser.handle,
    });
    await expect(usersApi.profile('xiaoming')).resolves.toMatchObject({ handle: 'xiaoming' });
    await expect(postsApi.drafts()).resolves.toMatchObject({
      list: expect.arrayContaining([expect.objectContaining({ draftId: 'd-1' })]),
    });
    await expect(postsApi.detail('post-1')).resolves.toMatchObject({ id: 'post-1' });
    await expect(communitiesApi.getDetailBySlug('ai-product')).resolves.toMatchObject({
      community: { communityId: 'c-1' },
    });
  });

  it('restores cross-domain writes and nested data without changing static fixtures', async () => {
    const baseline = await captureState();
    const staticFixtures = structuredClone({ currentUser, posts });
    const compose = buildPostComposeInput({
      bodyText: '隔离测试发布',
      mediaAssetIds: [],
      visibility: 'PUBLIC',
      commentPermission: 'EVERYONE',
      quotePermission: 'EVERYONE',
      repostPermission: 'EVERYONE',
    });
    const draft = await postsApi.createDraft(compose);
    const published = await postsApi.publish({ ...compose, allowWaitingMediaPublish: false });
    await postsApi.deleteDraft('d-1');
    await postsApi.createComment('post-1', {
      bodyText: '隔离测试评论',
      mediaItems: [],
      entityRanges: [],
      linkUrl: null,
      linkCardDisabled: false,
      composerMeta: compose.composerMeta,
    });
    await usersApi.updateOwnProfile({ displayName: '隔离测试用户' });
    await usersApi.unfollow('xiaoming');
    await usersApi.approveFollowRequest('follow-request-1');
    await authApi.changeHandle('isolated_handle');
    await authApi.revokeSession('mock-session-id');
    await notificationsApi.markAllRead();
    await settingsApi.updateInterests(['music']);
    await libraryApi.createCollection('隔离测试收藏夹');
    await libraryApi.clearHistory();
    await communitiesApi.updateRules('c-1', ['隔离测试社群规则']);
    await permissionsApi.update({ ...baseline.policy, allowSearchIndex: false });
    await expect(postsApi.createRepost('post-1')).resolves.toMatchObject({ noOp: false });
    await expect(postsApi.createRepost('post-1')).resolves.toMatchObject({ noOp: true });

    expect({ currentUser, posts }).toEqual(staticFixtures);
    await expect(usersApi.getOwnEditableProfile()).resolves.toMatchObject({
      displayName: '隔离测试用户',
    });
    await expect(notificationsApi.unread()).resolves.toMatchObject({ totalUnreadCount: 0 });
    await expect(libraryApi.history()).resolves.toMatchObject({ list: [] });

    resetMockState();

    expect(await captureState()).toEqual(baseline);
    await expect(postsApi.draftDetail(draft.draftId)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(postsApi.detail(published.postId)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(postsApi.createRepost('post-1')).resolves.toMatchObject({ noOp: false });

    resetMockState();
    expect(await captureState()).toEqual(baseline);
  });

  it('clears media assets and upload replay keys when state is reset', async () => {
    const input: CreateMediaUploadSessionsInput = {
      items: [
        {
          clientUploadId: 'reset-upload',
          scene: 'POST_COMPOSE',
          fileName: 'reset.png',
          contentType: 'image/png',
          sizeInBytes: '1024',
          assetKind: 'IMAGE',
        },
      ],
    };
    const created = (await mediaApi.createUploadSessions(input)).results[0];
    expect(created).toMatchObject({ resultType: 'CREATED' });
    if (!created || created.resultType === 'REJECTED') throw new Error('媒体会话创建失败');
    const replayed = (await mediaApi.createUploadSessions(input)).results[0];
    expect(replayed).toMatchObject({ resultType: 'REPLAYED', mediaAssetId: created.mediaAssetId });

    resetMockState();

    await expect(mediaApi.retryProcessing(created.mediaAssetId)).rejects.toMatchObject({
      httpStatus: 404,
      code: 'MEDIA_ASSET_NOT_FOUND',
    });
    expect((await mediaApi.createUploadSessions(input)).results[0]).toMatchObject({
      resultType: 'CREATED',
    });
  });
});
