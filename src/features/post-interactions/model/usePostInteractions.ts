import {
  useIsMutating,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { engagementApi } from '@/domains/engagement';
import { libraryApi, type BookmarkSourceScene } from '@/domains/library';
import { postsApi, type PostViewModel, type ReplyPostListItemView } from '@/domains/posts';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { useToast } from '@/shared/ui';
import { invalidateInteractionQueries } from './interactionCache';

type InteractionAction = 'like' | 'repost' | 'bookmark';

interface InteractionState {
  postId: string;
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  likes: number;
  bookmarks: number;
  reposts: number;
}

interface InteractionTarget {
  state: InteractionState;
  permissions: Record<InteractionAction, boolean>;
  sourceScene: BookmarkSourceScene;
}

interface InteractionVariables {
  postId: string;
  action: InteractionAction;
  active: boolean;
  previous: InteractionState;
  sourceScene: BookmarkSourceScene;
}

const fields = {
  like: { active: 'liked', count: 'likes', label: '点赞' },
  repost: { active: 'reposted', count: 'reposts', label: '转发' },
  bookmark: { active: 'bookmarked', count: 'bookmarks', label: '收藏' },
} as const;

// Synchronous acquisition also rejects two card instances clicked in one turn,
// before React has rendered their shared mutation pending state.
const pendingTargets = new WeakMap<QueryClient, Set<string>>();

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

async function submitInteraction({ postId, action, active, sourceScene }: InteractionVariables) {
  switch (action) {
    case 'like':
      await (active ? engagementApi.like(postId) : engagementApi.unlike(postId));
      break;
    case 'repost':
      await (active ? postsApi.createRepost(postId) : postsApi.cancelRepost(postId));
      break;
    case 'bookmark':
      if (active) {
        await libraryApi.savePostBookmark(postId, { targetCollectionId: null, sourceScene });
      } else {
        await libraryApi.removePostBookmark(postId);
      }
  }
}

function useInteractions(target: InteractionTarget) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const source = target.state;
  const sourceKey = [
    source.postId,
    source.liked,
    source.bookmarked,
    source.reposted,
    source.likes,
    source.bookmarks,
    source.reposts,
  ].join('\u001f');
  const [state, setState] = useSynchronizedState(sourceKey, source);
  const mutationKey = ['post-interactions', source.postId];
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: submitInteraction,
    retry: false,
    onSuccess: (_result, { action, active }) => {
      if (action !== 'like') {
        showToast({
          tone: 'success',
          title:
            action === 'repost'
              ? active
                ? '已转发到你的主页'
                : '已取消转发'
              : active
                ? '已保存到默认收藏夹'
                : '已取消收藏',
        });
      }
    },
    onError: (_error, { postId, action, previous }) => {
      // A reused card can already display another post when the request settles.
      setState((current) => (current.postId === postId ? previous : current));
      showToast({
        tone: 'error',
        title: `${fields[action].label}操作失败`,
        description: '状态已回滚，请稍后重试。',
      });
    },
    onSettled: () => invalidateInteractionQueries(queryClient),
  });

  const toggle = async (action: InteractionAction) => {
    const postId = source.postId;
    if (!postId || pending || !target.permissions[action]) return;
    let locked = pendingTargets.get(queryClient);
    if (!locked) {
      locked = new Set();
      pendingTargets.set(queryClient, locked);
    }
    if (locked.has(postId)) return;
    locked.add(postId);
    const field = fields[action];
    const previous = state;
    const active = !previous[field.active];
    setState({
      ...previous,
      [field.active]: active,
      [field.count]: Math.max(0, previous[field.count] + (active ? 1 : -1)),
    });
    try {
      await mutation.mutateAsync({
        postId,
        action,
        active,
        previous,
        sourceScene: target.sourceScene,
      });
    } catch {
      // The mutation reports the error and restores state before cache refetches.
    } finally {
      locked.delete(postId);
    }
  };

  return {
    state,
    pending,
    targetPostId: source.postId,
    canLike: target.permissions.like,
    canRepost: target.permissions.repost,
    canBookmark: target.permissions.bookmark,
    toggleLike: () => toggle('like'),
    toggleRepost: () => toggle('repost'),
    toggleBookmark: () => toggle('bookmark'),
  };
}

export function usePostInteractions(post: PostViewModel) {
  return useInteractions({
    state: {
      postId: post.postKind === 'REPLY' ? post.id : (post.contentPostId ?? post.id),
      liked: post.viewer.liked,
      bookmarked: post.viewer.bookmarked,
      reposted: post.viewer.reposted,
      likes: post.stats.likes,
      bookmarks: post.stats.bookmarks,
      reposts: post.stats.reposts,
    },
    permissions: {
      like: post.permissions.canLike,
      repost: post.permissions.canRepost,
      bookmark: post.permissions.canBookmark !== false,
    },
    sourceScene: resolveBookmarkSourceScene(post),
  });
}

export function useCommentLike(item: ReplyPostListItemView) {
  const card = item.postCard;
  const summary = card?.interactionSummary;
  return useInteractions({
    state: {
      postId: card?.postId ?? '',
      liked: summary?.viewerState?.liked ?? false,
      likes: summary?.likeCount ?? 0,
      bookmarked: false,
      bookmarks: 0,
      reposted: false,
      reposts: 0,
    },
    permissions: {
      like: item.relation.status === 'ACTIVE' && card?.status === 'PUBLISHED',
      repost: false,
      bookmark: false,
    },
    sourceScene: 'POST_DETAIL',
  });
}
