import { describe, expect, it } from 'vitest';
import { getCurrentUserPresentation } from './presentation';

describe('current user presentation', () => {
  it('uses a neutral fallback without inventing a user identity', () => {
    expect(getCurrentUserPresentation(null)).toEqual({
      displayName: '当前用户',
      handle: null,
      avatarFallback: '当',
      profilePath: '/settings/profile',
    });
  });

  it('normalizes the available identity and encodes its profile route', () => {
    expect(
      getCurrentUserPresentation({
        displayName: ' 林知夏 ',
        handle: 'name / 中文',
      }),
    ).toEqual({
      displayName: '林知夏',
      handle: 'name / 中文',
      avatarFallback: '林',
      profilePath: '/users/name%20%2F%20%E4%B8%AD%E6%96%87',
    });
  });
});
