import { communitiesApi } from '@/domains/communities';
import { engagementApi } from '@/domains/engagement';
import { feedApi } from '@/domains/feed';
import { libraryApi } from '@/domains/library';
import { postsApi } from '@/domains/posts';
import { resetMockState } from './state';

describe('default mock interaction consistency', () => {
  it('persists likes in detail, feed and bookmark projections without changing neighboring posts', async () => {
    const initial = await postsApi.detail('post-1');
    const neighbor = await postsApi.detail('post-2');
    await engagementApi.like('post-1');
    await engagementApi.like('post-1');
    const expected = { viewer: { liked: true }, stats: { likes: initial.stats.likes + 1 } };
    await expect(postsApi.detail('post-1')).resolves.toMatchObject(expected);
    expect(
      (await feedApi.list('following')).list.find((post) => post.id === 'post-1'),
    ).toMatchObject(expected);
    expect(
      (await libraryApi.collectionItems('bookmark-default')).list.find(
        (item) => item.postId === 'post-1',
      ),
    ).toMatchObject({
      postCard: {
        interactionSummary: { likeCount: initial.stats.likes + 1, viewerState: { liked: true } },
      },
    });
    expect(
      (await libraryApi.history()).list.find((item) => item.postId === 'post-1'),
    ).toMatchObject({
      postCard: {
        interactionSummary: { likeCount: initial.stats.likes + 1, viewerState: { liked: true } },
      },
    });
    expect(
      (await communitiesApi.getDetailBySlug('ai-product')).pinnedPosts.find(
        (item) => item.postId === 'post-1',
      ),
    ).toMatchObject({
      interactionSummary: { likeCount: initial.stats.likes + 1, viewerState: { liked: true } },
    });
    await expect(postsApi.detail('post-2')).resolves.toMatchObject({
      viewer: neighbor.viewer,
      stats: neighbor.stats,
    });

    await engagementApi.unlike('post-1');
    await engagementApi.unlike('post-1');
    await expect(postsApi.detail('post-1')).resolves.toMatchObject({
      viewer: initial.viewer,
      stats: initial.stats,
    });
  });

  it('keeps repeated repost and bookmark writes idempotent and restores them on reset', async () => {
    const initial = await postsApi.detail('post-2');
    expect(initial.viewer.bookmarked).toBe(true);
    await postsApi.createRepost('post-2');
    await postsApi.createRepost('post-2');
    await libraryApi.removePostBookmark('post-2');
    await libraryApi.removePostBookmark('post-2');
    const expected = {
      viewer: { reposted: true, bookmarked: false },
      stats: { reposts: initial.stats.reposts + 1, bookmarks: initial.stats.bookmarks - 1 },
    };
    await expect(postsApi.detail('post-2')).resolves.toMatchObject(expected);
    expect(
      (await feedApi.list('following')).list.find((post) => post.id === 'post-2'),
    ).toMatchObject(expected);
    expect(
      (await libraryApi.collectionItems('bookmark-default')).list.some(
        (item) => item.postId === 'post-2',
      ),
    ).toBe(false);

    await libraryApi.savePostBookmark('post-2');
    await libraryApi.savePostBookmark('post-2');
    await postsApi.cancelRepost('post-2');
    await postsApi.cancelRepost('post-2');
    await expect(postsApi.detail('post-2')).resolves.toMatchObject({
      viewer: initial.viewer,
      stats: initial.stats,
    });
    await engagementApi.like('post-2');
    resetMockState();
    await expect(postsApi.detail('post-2')).resolves.toMatchObject({
      viewer: initial.viewer,
      stats: initial.stats,
    });
  });

  it('targets the reply post for comment likes and preserves root post counters', async () => {
    const root = await postsApi.detail('post-1');
    const before = (await postsApi.listReplies('post-1')).list.find(
      (item) => item.relation.commentId === 'comment-1',
    );
    const previousCount = before?.postCard?.interactionSummary?.likeCount;
    expect(previousCount).toBeTypeOf('number');
    await engagementApi.like('comment-post-1');
    await engagementApi.like('comment-post-1');
    const after = (await postsApi.listReplies('post-1')).list.find(
      (item) => item.relation.commentId === 'comment-1',
    );
    expect(after).toMatchObject({
      postCard: {
        interactionSummary: {
          likeCount: (previousCount ?? 0) + 1,
          viewerState: { liked: true },
        },
      },
    });
    await expect(postsApi.detail('post-1')).resolves.toMatchObject({
      viewer: root.viewer,
      stats: root.stats,
    });
    resetMockState();
    expect(
      (await postsApi.listReplies('post-1')).list.find(
        (item) => item.relation.commentId === 'comment-1',
      ),
    ).toEqual(before);
  });
});
