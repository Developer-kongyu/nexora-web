import { describe, expect, it } from 'vitest';
import { buildPostTextSegments } from './postText';

describe('post text presentation', () => {
  it('keeps hashtags, mentions, and links in their original text positions', () => {
    expect(
      buildPostTextSegments('查看 https://example.com/spec?q=1，联系 @alice，并讨论 #产品设计。'),
    ).toEqual([
      { kind: 'TEXT', text: '查看 ' },
      {
        kind: 'LINK',
        text: 'https://example.com/spec?q=1',
        url: 'https://example.com/spec?q=1',
      },
      { kind: 'TEXT', text: '，联系 ' },
      { kind: 'MENTION', text: '@alice', handle: 'alice' },
      { kind: 'TEXT', text: '，并讨论 ' },
      { kind: 'HASHTAG', text: '#产品设计', tag: '产品设计' },
      { kind: 'TEXT', text: '。' },
    ]);
  });

  it('returns plain text unchanged when no entities exist', () => {
    expect(buildPostTextSegments('普通正文')).toEqual([{ kind: 'TEXT', text: '普通正文' }]);
  });
});
