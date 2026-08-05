import { describe, expect, it } from 'vitest';
import type { PostCardBriefView } from '../model/types';
import { mergeReplyTarget, mergeRepostSource, postCardBriefToViewModel } from './postCardAdapter';

const card: PostCardBriefView = {
  postId: 'post-1',
  authorUserId: 'user-1',
  postKind: 'ORIGINAL',
  bodyTextPreview: '正文摘要',
  visibility: 'PUBLIC',
  status: 'PUBLISHED',
  publishedAtIso: '2026-07-28T01:00:00.000Z',
  author: {
    userId: 'user-1',
    handle: 'author',
    displayName: '作者',
    avatarUrl: null,
  },
  community: null,
  attachedMedia: [],
  linkCard: null,
  interactionSummary: {
    likeCount: 3,
    bookmarkCount: 2,
    commentCount: 1,
    quoteCount: 0,
    repostCount: 4,
    viewerState: {
      liked: true,
      reposted: false,
      bookmarked: true,
      bookmarkCollectionId: 'collection-1',
    },
  },
};

describe('postCardBriefToViewModel', () => {
  it('maps authoritative identifiers and viewer state without changing them', () => {
    const result = postCardBriefToViewModel(card, 'bookmark');

    expect(result).toMatchObject({
      id: 'post-1',
      content: '正文摘要',
      variant: 'bookmark',
      author: { id: 'user-1', handle: 'author' },
      viewer: { liked: true, bookmarked: true, reposted: false },
      stats: { likes: 3, bookmarks: 2, comments: 1, reposts: 4 },
    });
  });

  it('uses a non-linkable presentation fallback when author hydration is missing', () => {
    const result = postCardBriefToViewModel({ ...card, author: null });
    expect(result.author).toMatchObject({ id: 'user-1', handle: 'unavailable' });
    expect(result.authorProfileAvailable).toBe(false);
  });

  it('omits attached media that has no renderable public or thumbnail URL', () => {
    const result = postCardBriefToViewModel({
      ...card,
      attachedMedia: [
        {
          mediaAssetId: 'media-hidden',
          mediaType: 'IMAGE',
          sortOrder: 0,
          title: null,
          description: null,
          width: null,
          height: null,
          durationMs: null,
          publicUrl: null,
          thumbnailUrl: null,
          renderStatus: 'MISSING',
        },
      ],
    });

    expect(result.media).toEqual([]);
  });

  it('uses a thumbnail as the render URL when the public asset URL is unavailable', () => {
    const result = postCardBriefToViewModel({
      ...card,
      attachedMedia: [
        {
          mediaAssetId: 'media-thumbnail',
          mediaType: 'VIDEO',
          sortOrder: 0,
          title: '视频标题',
          description: '视频说明',
          width: 1920,
          height: 1080,
          durationMs: 1_499,
          publicUrl: null,
          thumbnailUrl: '/media/video-thumbnail.jpg',
          renderStatus: 'READY',
        },
      ],
    });

    expect(result.media).toEqual([
      {
        id: 'media-thumbnail',
        kind: 'video',
        url: '/media/video-thumbnail.jpg',
        posterUrl: '/media/video-thumbnail.jpg',
        alt: '视频说明',
        title: '视频标题',
        description: '视频说明',
        width: 1920,
        height: 1080,
        durationSeconds: 1,
      },
    ]);
  });

  it('keeps the repost actor while displaying the source post', () => {
    const repost = postCardBriefToViewModel({
      ...card,
      postId: 'repost-1',
      postKind: 'REPOST',
      bodyTextPreview: null,
      authorUserId: 'user-reposter',
      author: {
        userId: 'user-reposter',
        handle: 'reposter',
        displayName: '转发者',
        avatarUrl: '/reposter.png',
      },
    });
    const source = postCardBriefToViewModel(card);
    const result = mergeRepostSource(repost, source);

    expect(result.id).toBe('repost-1');
    expect(result.contentPostId).toBe('post-1');
    expect(result.postKind).toBe('REPOST');
    expect(result.author.displayName).toBe('作者');
    expect(result.relation?.actor.displayName).toBe('转发者');
  });

  it('hydrates a reply with its direct target author', () => {
    const reply = postCardBriefToViewModel({
      ...card,
      postId: 'reply-1',
      postKind: 'REPLY',
    });
    const target = postCardBriefToViewModel({
      ...card,
      postId: 'parent-1',
      authorUserId: 'parent-user',
      author: {
        userId: 'parent-user',
        handle: 'parent',
        displayName: '直接父级作者',
        avatarUrl: null,
      },
    });
    const result = mergeReplyTarget(reply, target);

    expect(result.relation).toMatchObject({
      kind: 'REPLY',
      targetAuthor: { id: 'parent-user', handle: 'parent' },
      targetProfileAvailable: true,
    });
  });
});
