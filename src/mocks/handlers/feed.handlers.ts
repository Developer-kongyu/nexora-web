import { http, delay } from 'msw';
import { ok, cursorPage } from './http';
import { fixtureState } from '../state/fixtures.state';
import { postsState } from '../state/posts.state';

export const feedHandlers = [
  http.get('/api/feeds/following', async () => {
    await delay(180);
    return ok(cursorPage(fixtureState.posts.map((post) => postsState.mockFeedListItem(post.id))));
  }),
  http.get('/api/feeds/for-you', async () => {
    await delay(180);
    return ok(
      cursorPage(
        [...fixtureState.posts].reverse().map((post) => postsState.mockFeedListItem(post.id)),
      ),
    );
  }),
  http.get('/api/feeds/explore/posts', () =>
    ok(
      cursorPage(
        fixtureState.posts.slice(0, 2).map((post) => postsState.mockFeedListItem(post.id)),
      ),
    ),
  ),
  http.get('/api/feeds/explore/topics', () =>
    ok([
      { id: 't1', title: '#人工智能', count: 123000 },
      { id: 't2', title: '#产品设计', count: 87000 },
      { id: 't3', title: '#程序员日常', count: 61000 },
    ]),
  ),
  http.get('/api/feeds/explore/communities', () => ok(cursorPage(fixtureState.communities))),
];
