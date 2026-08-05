import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { postCardBriefToViewModel } from '@/domains/posts/lib/postCardAdapter';
import type { PostCardBriefView } from '@/domains/posts/model/types';
import { posts } from '@/mocks/fixtures';
import { requireArrayItem } from '@/shared/lib/array';
import { PostCard } from './PostCard';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderPost(post = requireArrayItem(posts, 0, 'post fixture')) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PostCard post={post} />
        <LocationProbe />
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

  it('renders media without injecting detached tags that are absent from the body', () => {
    renderPost();
    expect(screen.queryByText('#摄影')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBeGreaterThan(1);
  });

  it('highlights each inline hashtag, mention, and link exactly once', () => {
    const post = {
      ...requireArrayItem(posts, 0, 'post fixture'),
      content: '查看 #产品设计，联系 @alice：https://example.com/spec。',
      tags: ['产品设计'],
    };
    renderPost(post);

    expect(screen.getAllByRole('link', { name: '#产品设计' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: '#产品设计' })).toHaveAttribute(
      'href',
      '/search?q=%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1',
    );
    expect(screen.getByRole('link', { name: '@alice' })).toHaveAttribute('href', '/users/alice');
    expect(screen.getByRole('link', { name: 'https://example.com/spec' })).toHaveAttribute(
      'target',
      '_blank',
    );
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

  it('renders the repost actor label separately from the source author', () => {
    const source = requireArrayItem(posts, 0, 'post fixture');
    const repost = {
      ...source,
      id: 'repost-post-1',
      contentPostId: source.id,
      postKind: 'REPOST' as const,
      relation: {
        kind: 'REPOST' as const,
        actor: {
          id: 'reposter-1',
          handle: 'reposter',
          displayName: '转发者',
          avatarUrl: null,
        },
        actorProfileAvailable: true,
        targetPostId: source.id,
        rootPostId: source.id,
        createdAt: '2026-08-04T00:00:00.000Z',
      },
    };

    renderPost(repost);

    expect(screen.getByText('转发了')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '转发者' })).toHaveAttribute('href', '/users/reposter');
    expect(screen.getByText(source.author.displayName)).toBeInTheDocument();
  });

  it('renders the direct reply target after the reply label', () => {
    const source = requireArrayItem(posts, 0, 'post fixture');
    renderPost({
      ...source,
      id: 'reply-post-1',
      contentPostId: 'reply-post-1',
      postKind: 'REPLY',
      relation: {
        kind: 'REPLY',
        actor: source.author,
        actorProfileAvailable: true,
        targetAuthor: {
          id: 'parent-user',
          handle: 'parent',
          displayName: '直接父级作者',
          avatarUrl: null,
        },
        targetProfileAvailable: true,
        targetPostId: 'parent-post-1',
        rootPostId: 'root-post-1',
        createdAt: '2026-08-04T00:00:00.000Z',
      },
    });

    const label = screen.getByText('回复了').parentElement;
    expect(label).not.toBeNull();
    if (!label) throw new Error('reply label is unavailable');
    expect(within(label).getByRole('link', { name: '@parent' })).toHaveAttribute(
      'href',
      '/users/parent',
    );
    expect(screen.getByTitle('查看回复详情')).toHaveAttribute('href', '/posts/reply-post-1');
  });

  it('shows a stable missing-user label when the direct reply author is unavailable', () => {
    const source = requireArrayItem(posts, 0, 'post fixture');
    renderPost({
      ...source,
      id: 'reply-missing-user',
      postKind: 'REPLY',
      relation: {
        kind: 'REPLY',
        actor: source.author,
        actorProfileAvailable: true,
        targetProfileAvailable: false,
        targetPostId: 'parent-post-missing-user',
        rootPostId: 'root-post-1',
        createdAt: '2026-08-04T00:00:00.000Z',
      },
    });

    const label = screen.getByText('回复了').parentElement;
    expect(label).not.toBeNull();
    if (!label) throw new Error('reply label is unavailable');
    expect(within(label).getByText('用户不存在')).toBeInTheDocument();
    expect(within(label).queryByText('原内容')).not.toBeInTheDocument();
  });

  it('does not call an unhydrated reply target a missing user', () => {
    const source = requireArrayItem(posts, 0, 'post fixture');
    renderPost({
      ...source,
      id: 'reply-unhydrated-target',
      postKind: 'REPLY',
      relation: {
        kind: 'REPLY',
        actor: source.author,
        actorProfileAvailable: true,
        targetPostId: 'parent-post-not-hydrated',
        rootPostId: 'root-post-1',
        createdAt: '2026-08-04T00:00:00.000Z',
      },
    });

    const label = screen.getByText('回复了').parentElement;
    expect(label).not.toBeNull();
    if (!label) throw new Error('reply label is unavailable');
    expect(within(label).getByText('回复对象暂不可用')).toBeInTheDocument();
    expect(within(label).queryByText('用户不存在')).not.toBeInTheDocument();
  });

  it('opens the current reply id instead of a parent content id', () => {
    const source = requireArrayItem(posts, 0, 'post fixture');
    renderPost({
      ...source,
      id: 'reply-post-1',
      contentPostId: 'parent-post-1',
      postKind: 'REPLY',
    });

    fireEvent.click(screen.getByRole('article'));

    expect(screen.getByTestId('location')).toHaveTextContent('/posts/reply-post-1');
  });

  it('opens the displayed post detail when the card body is clicked', () => {
    const source = requireArrayItem(posts, 0, 'post fixture');
    renderPost({
      ...source,
      id: 'repost-post-1',
      contentPostId: source.id,
    });

    fireEvent.click(screen.getByRole('article'));

    expect(screen.getByTestId('location')).toHaveTextContent(`/posts/${source.id}`);
  });

  it('keeps nested links independent from the card detail navigation', () => {
    const post = requireArrayItem(posts, 0, 'post fixture');
    renderPost(post);

    fireEvent.click(
      requireArrayItem(
        screen.getAllByRole('link', { name: post.author.displayName }),
        0,
        'author link',
      ),
    );

    expect(screen.getByTestId('location')).toHaveTextContent(`/users/${post.author.handle}`);
  });
});
