import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, Eye, Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { engagementApi } from '@/domains/engagement';
import { libraryApi, libraryKeys, type BookmarkSourceScene } from '@/domains/library';
import { postsApi, type PostViewModel } from '@/domains/posts';
import { paths } from '@/shared/config/paths';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
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

interface PostActionState {
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  likes: number;
  bookmarks: number;
  reposts: number;
}

function resolveBookmarkSourceScene(post: PostViewModel): BookmarkSourceScene {
  switch (post.variant) {
    case 'detail':
      return 'POST_DETAIL';
    case 'search':
      return 'SEARCH_RESULT';
    case 'profile':
      return 'PROFILE_POST';
    case 'community':
    case 'announcement':
      return 'COMMUNITY_POST';
    default:
      return 'FEED_CARD';
  }
}

function createPostActionState(post: PostViewModel): PostActionState {
  return {
    liked: post.viewer.liked,
    bookmarked: post.viewer.bookmarked,
    reposted: post.viewer.reposted,
    likes: post.stats.likes,
    bookmarks: post.stats.bookmarks,
    reposts: post.stats.reposts,
  };
}

function getPostActionSourceKey(post: PostViewModel): string {
  return [
    post.id,
    post.viewer.liked,
    post.viewer.bookmarked,
    post.viewer.reposted,
    post.stats.likes,
    post.stats.bookmarks,
    post.stats.reposts,
  ].join('\u001f');
}

function adjustCount(value: number, active: boolean): number {
  return Math.max(0, value + (active ? 1 : -1));
}

export function PostActionBar({ post }: { post: PostViewModel }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [actionState, setActionState] = useSynchronizedState(
    getPostActionSourceKey(post),
    createPostActionState(post),
  );
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);

  const toggleLike = async () => {
    if (pendingAction || !post.permissions.canLike) return;
    const next = !actionState.liked;
    setPendingAction('like');
    setActionState((current) => ({
      ...current,
      liked: next,
      likes: adjustCount(current.likes, next),
    }));
    try {
      await (next ? engagementApi.like(post.id) : engagementApi.unlike(post.id));
    } catch {
      setActionState((current) => ({
        ...current,
        liked: !next,
        likes: adjustCount(current.likes, !next),
      }));
      showToast({
        tone: 'error',
        title: '点赞操作失败',
        description: '状态已回滚，请检查网络后重试。',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const toggleRepost = async () => {
    if (pendingAction || !post.permissions.canRepost) return;
    const next = !actionState.reposted;
    setPendingAction('repost');
    setActionState((current) => ({
      ...current,
      reposted: next,
      reposts: adjustCount(current.reposts, next),
    }));
    try {
      await (next ? postsApi.createRepost(post.id) : postsApi.cancelRepost(post.id));
      showToast({ tone: 'success', title: next ? '已转发到你的主页' : '已取消转发' });
    } catch {
      setActionState((current) => ({
        ...current,
        reposted: !next,
        reposts: adjustCount(current.reposts, !next),
      }));
      showToast({
        tone: 'error',
        title: '转发操作失败',
        description: '状态已回滚，请稍后重试。',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const toggleBookmark = async () => {
    if (pendingAction) return;
    const next = !actionState.bookmarked;
    setPendingAction('bookmark');
    setActionState((current) => ({
      ...current,
      bookmarked: next,
      bookmarks: adjustCount(current.bookmarks, next),
    }));
    try {
      if (next) {
        await libraryApi.savePostBookmark(post.id, {
          targetCollectionId: null,
          sourceScene: resolveBookmarkSourceScene(post),
        });
      } else {
        await libraryApi.removePostBookmark(post.id);
      }
      showToast({ tone: 'success', title: next ? '已保存到默认收藏夹' : '已取消收藏' });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.bookmarks });
    } catch {
      setActionState((current) => ({
        ...current,
        bookmarked: !next,
        bookmarks: adjustCount(current.bookmarks, !next),
      }));
      showToast({
        tone: 'error',
        title: '收藏操作失败',
        description: '状态已回滚，请稍后重试。',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const copyPostLink = async (url: string) => {
    await copyTextToClipboard(url);
    showToast({ tone: 'success', title: '帖子链接已复制' });
  };

  const share = async () => {
    if (pendingAction) return;
    const url = `${window.location.origin}/posts/${encodeURIComponent(post.id)}`;
    setPendingAction('share');
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
      setPendingAction(null);
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
        void navigate(paths.post(post.id));
      },
    },
    {
      key: 'like',
      label: '点赞',
      count: actionState.likes,
      icon: Heart,
      active: actionState.liked,
      disabled: !post.permissions.canLike,
      action: () => void toggleLike(),
    },
    {
      key: 'repost',
      label: '转发',
      count: actionState.reposts,
      icon: Repeat2,
      active: actionState.reposted,
      disabled: !post.permissions.canRepost,
      action: () => void toggleRepost(),
    },
    {
      key: 'bookmark',
      label: '收藏',
      count: actionState.bookmarks,
      icon: Bookmark,
      active: actionState.bookmarked,
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
            disabled={disabled || pendingAction !== null}
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
