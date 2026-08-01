import { describe, expect, it } from 'vitest';
import {
  buildPostComposeInput,
  extractFirstHttpUrl,
  fingerprintPostCompose,
  hasPostComposeContent,
  toPostComposeInput,
} from './compose';

describe('post compose model', () => {
  it('builds the canonical B04 compose payload and preserves UTF-16 offsets', () => {
    const input = buildPostComposeInput({
      bodyText: '你好 @alice，看看 https://example.com/path #产品设计',
      mediaAssetIds: ['asset-1', 'asset-2'],
      visibility: 'PUBLIC',
      communityId: 'community-1',
      commentPermission: 'FOLLOWING',
      quotePermission: 'NO_ONE',
      repostPermission: 'EVERYONE',
    });

    expect(input.mediaItems).toEqual([
      { mediaAssetId: 'asset-1', title: null, description: null, sortOrder: 0 },
      { mediaAssetId: 'asset-2', title: null, description: null, sortOrder: 1 },
    ]);
    expect(input.linkUrl).toBe('https://example.com/path');
    expect(input.entityRanges).toEqual([
      {
        entityType: 'MENTION',
        mentionedUserId: null,
        handleSnapshot: 'alice',
        displayText: '@alice',
        startOffset: 3,
        endOffset: 9,
      },
      {
        entityType: 'HASHTAG',
        tagTextSnapshot: '产品设计',
        startOffset: 38,
        endOffset: 43,
      },
    ]);
    for (const range of input.entityRanges) {
      const expectedText =
        range.entityType === 'MENTION' ? range.displayText : `#${range.tagTextSnapshot}`;
      expect(input.bodyText?.slice(range.startOffset, range.endOffset)).toBe(expectedText);
    }
    expect(input.composerMeta.normalizationVersion).toBe('POST_TEXT_NORMALIZATION_V1');
  });

  it('normalizes blank text and reports whether a compose payload has publishable content', () => {
    const blank = buildPostComposeInput({
      bodyText: '  \r\n ',
      mediaAssetIds: [],
      visibility: null,
    });
    const mediaOnly = buildPostComposeInput({
      bodyText: '',
      mediaAssetIds: ['asset-1'],
      visibility: 'PRIVATE',
    });

    expect(blank.bodyText).toBeNull();
    expect(hasPostComposeContent(blank)).toBe(false);
    expect(hasPostComposeContent(mediaOnly)).toBe(true);
    expect(fingerprintPostCompose(mediaOnly)).toBe(fingerprintPostCompose({ ...mediaOnly }));
  });

  it('ignores server-only draft projection fields when comparing compose fingerprints', () => {
    const compose = buildPostComposeInput({
      bodyText: '服务端草稿快照',
      mediaAssetIds: ['asset-1'],
      visibility: 'FOLLOWERS',
    });
    const serverSnapshot = {
      ...compose,
      bodyTextNormalized: '服务端草稿快照',
    };

    expect(toPostComposeInput(serverSnapshot)).toEqual(compose);
    expect(toPostComposeInput(serverSnapshot)).not.toHaveProperty('bodyTextNormalized');
    expect(fingerprintPostCompose(serverSnapshot)).toBe(fingerprintPostCompose(compose));
  });

  it('only extracts http and https links', () => {
    expect(extractFirstHttpUrl('ftp://example.com')).toBeNull();
    expect(extractFirstHttpUrl('打开 https://example.com。')).toBe('https://example.com');
    expect(extractFirstHttpUrl('详情：https://example.com/path?a=1&b=2！')).toBe(
      'https://example.com/path?a=1&b=2',
    );
  });

  it('recognizes mentions and hashtags after Chinese punctuation', () => {
    const input = buildPostComposeInput({
      bodyText: '你好，@alice；#产品设计',
      mediaAssetIds: [],
      visibility: 'PUBLIC',
    });

    expect(input.entityRanges).toEqual([
      {
        entityType: 'MENTION',
        mentionedUserId: null,
        handleSnapshot: 'alice',
        displayText: '@alice',
        startOffset: 3,
        endOffset: 9,
      },
      {
        entityType: 'HASHTAG',
        tagTextSnapshot: '产品设计',
        startOffset: 10,
        endOffset: 15,
      },
    ]);
  });
});
