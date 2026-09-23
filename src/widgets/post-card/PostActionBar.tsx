import { Bookmark, Eye, Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostViewModel } from '@/domains/posts';
import { usePostInteractions } from '@/features/post-interactions';
import { paths } from '@/shared/config/paths';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { formatCount } from '@/shared/lib/format';
import { useToast } from '@/shared/ui';
import styles from './PostCard.module.css';

type ActionKey = 'comments' | 'like' | 'repost' | 'bookmark' | 'share';

interface ActionItem {
  key: ActionKey;
  label: string;
  count: number;
  icon: ComponentType<{ size?: number; fill?: string }>;
  active?: boolean;
  disabled?: boolean;
  action: () => void;
}

export function PostActionBar({ post }: { post: PostViewModel }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    state: actionState,
    pending,
    targetPostId: contentPostId,
    canLike,
    canRepost,
    canBookmark,
    toggleLike,
    toggleRepost,
    toggleBookmark,
  } = usePostInteractions(post);
  const [sharing, setSharing] = useState(false);
  const busy = pending || sharing;

  const copyPostLink = async (url: string) => {
    await copyTextToClipboard(url);
    showToast({ tone: 'success', title: '帖子链接已复制' });
  };

  const share = async () => {
    if (busy) return;
    const url = `${window.location.origin}/posts/${encodeURIComponent(contentPostId)}`;
    setSharing(true);
    try {
      const shareWithNavigator = navigator.share?.bind(navigator);
      if (shareWithNavigator) {
        await shareWithNavigator({ title: `${post.author.displayName} 的帖子`, url });
        showToast({ tone: 'success', title: '帖子已分享' });
      } else {
        await copyPostLink(url);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await copyPostLink(url);
      } catch {
        showToast({
          tone: 'error',
          title: '分享失败',
          description: '浏览器未提供分享或剪贴板权限。',
        });
      }
    } finally {
      setSharing(false);
    }
  };

  const items: ActionItem[] = [
    {
      key: 'comments',
      label: '评论',
      count: post.stats.comments,
      icon: MessageCircle,
      disabled: !post.permissions.canComment,
      action: () => {
        void navigate(paths.post(contentPostId));
      },
    },
    {
      key: 'like',
      label: '点赞',
      count: actionState.likes,
      icon: Heart,
      active: actionState.liked,
      disabled: !canLike,
      action: () => void toggleLike(),
    },
    {
      key: 'repost',
      label: '转发',
      count: actionState.reposts,
      icon: Repeat2,
      active: actionState.reposted,
      disabled: !canRepost,
      action: () => void toggleRepost(),
    },
    {
      key: 'bookmark',
      label: '收藏',
      count: actionState.bookmarks,
      icon: Bookmark,
      active: actionState.bookmarked,
      disabled: !canBookmark,
      action: () => void toggleBookmark(),
    },
    {
      key: 'share',
      label: '分享',
      count: post.stats.shares,
      icon: Share2,
      action: () => void share(),
    },
  ];

  return (
    <footer className={styles.actionRegion}>
      <div className={styles.actionGrid}>
        {items.map(({ key, label, count, icon: Icon, active, disabled, action }) => (
          <button
            key={key}
            type="button"
            className={active ? styles.actionActive : styles.actionItem}
            onClick={action}
            disabled={disabled || busy}
            aria-pressed={active}
            aria-label={`${label} ${formatCount(count)}`}
          >
            <Icon
              size={17}
              fill={active && (key === 'like' || key === 'bookmark') ? 'currentColor' : 'none'}
            />
            <span>{formatCount(count)}</span>
            <em>{label}</em>
          </button>
        ))}
        <span className={styles.actionMetric} aria-label={`浏览 ${formatCount(post.stats.views)}`}>
          <Eye size={17} />
          <span>{formatCount(post.stats.views)}</span>
          <em>浏览</em>
        </span>
      </div>
    </footer>
  );
}
