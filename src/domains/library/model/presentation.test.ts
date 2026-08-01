import { describe, expect, it } from 'vitest';
import { getPostAvailabilityPlaceholderMessage } from './presentation';

describe('library placeholder presentation', () => {
  it('shares common reason messages across bookmark and history surfaces', () => {
    expect(getPostAvailabilityPlaceholderMessage('DENY_POST_NOT_FOUND', 'bookmark')).toBe(
      '原帖已不存在',
    );
    expect(getPostAvailabilityPlaceholderMessage('DENY_POST_NOT_FOUND', 'history')).toBe(
      '原帖已不存在',
    );
  });

  it('keeps the one surface-specific reason explicit', () => {
    expect(
      getPostAvailabilityPlaceholderMessage('DENY_COMMUNITY_POST_MUST_BE_PUBLIC', 'bookmark'),
    ).toBe('该社群内容不可在收藏页展示');
    expect(
      getPostAvailabilityPlaceholderMessage('DENY_COMMUNITY_POST_MUST_BE_PUBLIC', 'history'),
    ).toBe('该社群内容不可在历史页展示');
  });
});
