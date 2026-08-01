import { describe, expect, it } from 'vitest';
import { paths } from './paths';

describe('application paths', () => {
  it('encodes dynamic path segments', () => {
    expect(paths.profile('name / 中文')).toBe('/users/name%20%2F%20%E4%B8%AD%E6%96%87');
    expect(paths.post('post / 1')).toBe('/posts/post%20%2F%201');
    expect(paths.postMedia('post / 1', 2)).toBe('/posts/post%20%2F%201/media/2');
    expect(paths.composeDraft('draft / 1')).toBe('/compose/draft%20%2F%201');
    expect(paths.bookmarkCollection('collection / 1')).toBe(
      '/bookmarks/collection%20%2F%201',
    );
    expect(paths.community('产品 / 讨论')).toBe(
      '/communities/%E4%BA%A7%E5%93%81%20%2F%20%E8%AE%A8%E8%AE%BA',
    );
  });

  it('builds profile subroutes and encoded search queries from one owner', () => {
    expect(paths.profileFollowers('name / 中文')).toBe(
      '/users/name%20%2F%20%E4%B8%AD%E6%96%87/followers',
    );
    expect(paths.profileFollowing('name / 中文')).toBe(
      '/users/name%20%2F%20%E4%B8%AD%E6%96%87/following',
    );
    expect(paths.searchResults('AI 产品')).toBe('/search?q=AI%20%E4%BA%A7%E5%93%81');
    expect(paths.communityAbout('产品 / 讨论')).toBe(
      '/communities/%E4%BA%A7%E5%93%81%20%2F%20%E8%AE%A8%E8%AE%BA?tab=about',
    );
    expect(paths.communityManageSection('community / 1', 'members / active')).toBe(
      '/communities/community%20%2F%201/manage/members%20%2F%20active',
    );
    expect(paths.composeForCommunity('community / 1')).toBe(
      '/compose?community=community%20%2F%201',
    );
    expect(paths.passwordResetFor('mail+tag@example.com')).toBe(
      '/auth/password/reset?identifier=mail%2Btag%40example.com',
    );
  });
});
