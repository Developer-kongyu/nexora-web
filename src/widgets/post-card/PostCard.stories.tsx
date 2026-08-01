import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { posts } from '@/mocks/fixtures';
import { requireArrayItem } from '@/shared/lib/array';
import { ToastProvider } from '@/shared/ui';
import { PostCard } from './PostCard';

function StoryProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/home']}>
        <ToastProvider>{children}</ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Widgets/PostCard',
  component: PostCard,
  decorators: [
    (Story) => (
      <StoryProviders>
        <div style={{ width: 760 }}>
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof PostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Feed: Story = {
  args: { post: requireArrayItem(posts, 0, 'feed post fixture') },
};

export const LinkPreview: Story = {
  args: { post: requireArrayItem(posts, 2, 'link preview post fixture') },
};
