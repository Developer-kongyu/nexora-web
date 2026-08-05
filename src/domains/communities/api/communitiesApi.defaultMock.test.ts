import { describe, expect, it } from 'vitest';
import { communitiesApi } from '@/domains/communities';

describe('communitiesApi default MSW contract', () => {
  it('combines canonical public cards with batch membership states', async () => {
    const page = await communitiesApi.list();
    expect(page.list.length).toBeGreaterThan(0);
    expect(page.list[0]).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      name: expect.any(String),
      membersCount: expect.any(Number),
      joined: expect.any(Boolean),
    });
  });

  it('returns canonical and legacy detail views through the same slug route', async () => {
    const page = await communitiesApi.list();
    const first = page.list[0];
    expect(first).toBeDefined();

    const canonical = await communitiesApi.getDetailBySlug(first!.slug);
    expect(canonical).toMatchObject({
      community: {
        communityId: first!.id,
        slug: first!.slug,
        name: first!.name,
        memberCount: expect.any(Number),
        postCount: expect.any(Number),
      },
      rules: expect.any(Array),
      managers: expect.any(Array),
      pinnedPosts: expect.any(Array),
    });

    const detail = await communitiesApi.detail(first!.slug);
    expect(detail).toMatchObject({
      id: first!.id,
      slug: first!.slug,
      name: first!.name,
      rules: expect.any(Array),
      posts: expect.any(Array),
    });
  });
});
