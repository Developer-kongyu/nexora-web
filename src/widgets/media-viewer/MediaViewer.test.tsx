import { render, screen } from '@testing-library/react';
import { posts } from '@/mocks/fixtures';
import { requireArrayItem } from '@/shared/lib/array';
import { MediaViewer } from './MediaViewer';

describe('MediaViewer', () => {
  it('places play and fullscreen controls inside the media stage', () => {
    const post = {
      ...requireArrayItem(posts, 0, 'post fixture'),
      media: [
        {
          id: 'v1',
          kind: 'video' as const,
          url: '/media/video-poster.svg',
          posterUrl: '/media/video-poster.svg',
          alt: '演示视频',
          title: '演示视频',
          description: '详细描述',
        },
      ],
    };
    render(<MediaViewer post={post} />);
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '全屏' })).toHaveLength(2);
    expect(screen.getByText('图片信息')).toBeInTheDocument();
    expect(screen.getByText('帖子摘要')).toBeInTheDocument();
  });
});
