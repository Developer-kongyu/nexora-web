import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { postCardBriefToViewModel } from '@/domains/posts/lib/postCardAdapter';
import type { PostCardBriefView } from '@/domains/posts/model/types';
import { posts } from '@/mocks/fixtures';
import { requireArrayItem } from '@/shared/lib/array';
import { PostCard } from './PostCard';

function renderPost(post = requireArrayItem(posts, 0, 'post fixture')) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PostCard post={post} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PostCard', () => {
  it('renders the six post metrics in the required order', () => {
    renderPost();
    const footer = screen.getByRole('contentinfo');
    const labels = within(footer)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label')?.split(' ')[0]);

    expect(labels).toEqual(['评论', '点赞', '转发', '收藏', '分享']);
    expect(within(footer).getByLabelText(/^浏览 /)).toBeInTheDocument();
  });

  it('renders media and tags without absolute-positioned action content', () => {
    renderPost();
    expect(screen.getByText('#摄影')).toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBeGreaterThan(1);
  });

  it('does not create a user-profile link when author hydration is unavailable', () => {
    const card: PostCardBriefView = {
      postId: 'post-unavailable-author',
      authorUserId: 'user-unavailable',
      postKind: 'ORIGINAL',
      bodyTextPreview: '正文仍然可见',
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      publishedAtIso: '2026-07-28T01:00:00.000Z',
      author: null,
      community: null,
      attachedMedia: [],
      linkCard: null,
      interactionSummary: null,
    };

    renderPost(postCardBriefToViewModel(card));

    expect(screen.getByText('用户资料暂不可用')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '用户资料暂不可用' })).not.toBeInTheDocument();
    expect(screen.queryByText('@unavailable')).not.toBeInTheDocument();
  });
});
