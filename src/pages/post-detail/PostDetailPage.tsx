import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Send, ShieldCheck, Smile, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { engagementApi } from '@/domains/engagement';
import {
  createTextEngagementInput,
  postKeys,
  postsApi,
  type ReplyPostListItemView,
} from '@/domains/posts';
import { usePost } from '@/domains/posts/hooks/usePost';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { formatRelativeTime } from '@/shared/lib/format';
import { Avatar, Button, Card, IconButton, useToast } from '@/shared/ui';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { PostTagLinks } from '@/widgets/post-card/PostTagLinks';
import { EmptyPanel, LoadingRows, SideCard } from '../_shared/PageParts';
import styles from './PostDetailPage.module.css';

interface ReplyTarget {
  commentId: string;
  name: string;
}

interface SubmitCommentVariables {
  bodyText: string;
  target: ReplyTarget | null;
}

interface CommentLikeState {
  liked: boolean;
  likeCount: number;
}

interface CommentRowProps {
  item: ReplyPostListItemView;
  rootPostId: string;
  onReply: (target: ReplyTarget) => void;
}

function CommentRow({ item, rootPostId, onReply }: CommentRowProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const card = item.postCard;
  const initialLiked = Boolean(card?.interactionSummary?.viewerState?.liked);
  const initialLikeCount = card?.interactionSummary?.likeCount ?? 0;
  const likeSourceKey = [
    card?.postId ?? item.relation.commentId,
    initialLiked,
    initialLikeCount,
  ].join('\u001f');
  const [likeState, setLikeState] = useSynchronizedState<string, CommentLikeState>(likeSourceKey, {
    liked: initialLiked,
    likeCount: initialLikeCount,
  });

  const likeMutation = useMutation({
    mutationFn: (nextLiked: boolean) => {
      if (!card) throw new Error('COMMENT_POST_UNAVAILABLE');
      return nextLiked ? engagementApi.like(card.postId) : engagementApi.unlike(card.postId);
    },
    onMutate: (nextLiked) => {
      const previous = likeState;
      setLikeState((current) => ({
        liked: nextLiked,
        likeCount: Math.max(0, current.likeCount + (nextLiked ? 1 : -1)),
      }));
      return previous;
    },
    onError: (_error, _nextLiked, previous) => {
      if (previous) {
        setLikeState(previous);
      }
      showToast({ tone: 'error', title: '点赞操作失败', description: '请稍后重试。' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.replies(rootPostId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deleteComment(item.relation.commentId),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.replies(rootPostId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.detail(rootPostId) }),
      ]);
      showToast({ tone: 'success', title: '评论已删除' });
    },
    onError: () => showToast({ tone: 'error', title: '删除失败', description: '请稍后重试。' }),
  });

  if (item.relation.status !== 'ACTIVE' || !card) {
    return (
      <article className={styles.comment} data-tombstone="true">
        <Avatar fallback="·" alt="评论占位" />
        <div>
          <p className={styles.tombstone}>
            {item.tombstone?.state === 'HIDDEN' ? '此评论已被隐藏' : '此评论已删除'}
          </p>
        </div>
      </article>
    );
  }

  const author = card.author;
  const name = author?.displayName ?? '资料暂不可用';
  const handle = author?.handle ? `@${author.handle}` : '用户资料占位';
  const ownComment = currentUser?.id === item.relation.authorUserId;
  const replyCount = card.interactionSummary?.commentCount ?? 0;

  return (
    <article className={styles.comment}>
      <Avatar size="md" fallback={name.slice(0, 1)} alt={name} src={author?.avatarUrl} />
      <div>
        <header>
          <strong>{name}</strong>
          <span>
            {handle} · {formatRelativeTime(item.relation.createdAtIso)}
          </span>
        </header>
        <p>{card.bodyTextPreview || '该评论没有可展示的文本内容。'}</p>
        <div className={styles.commentActions}>
          <button
            type="button"
            onClick={() => onReply({ commentId: item.relation.commentId, name })}
          >
            回复
          </button>
          <button
            type="button"
            disabled={likeMutation.isPending}
            aria-pressed={likeState.liked}
            onClick={() => likeMutation.mutate(!likeState.liked)}
          >
            {likeState.liked ? '已赞' : '赞'} {likeState.likeCount}
          </button>
          {replyCount > 0 ? (
            <span className={styles.replyCount} title="后端当前未公开楼中楼读取接口">
              {replyCount} 条回复
            </span>
          ) : null}
          {ownComment ? (
            <button
              type="button"
              className={styles.deleteAction}
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 size={12} /> 删除
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function PostDetailPage() {
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const post = usePost(postId);
  const currentUser = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

  const replies = useInfiniteQuery({
    queryKey: postKeys.replies(postId),
    queryFn: ({ pageParam, signal }) =>
      postsApi.listReplies(postId, { cursor: pageParam, limit: 20 }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(postId),
  });

  const comments = useMemo(
    () => replies.data?.pages.flatMap((page) => page.list) ?? [],
    [replies.data?.pages],
  );
  const degradedReasons = useMemo(
    () => new Set(replies.data?.pages.flatMap((page) => page.degradedReasons) ?? []),
    [replies.data?.pages],
  );
  const filteredCountHint = useMemo(
    () => replies.data?.pages.reduce((sum, page) => sum + page.filteredCountHint, 0) ?? 0,
    [replies.data?.pages],
  );

  const createComment = useMutation({
    mutationFn: ({ bodyText, target }: SubmitCommentVariables) => {
      const input = createTextEngagementInput(bodyText);
      return target
        ? postsApi.replyComment(target.commentId, input)
        : postsApi.createComment(postId, input);
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.replies(postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      ]);
      setReply('');
      setReplyTo(null);
      showToast({
        tone: 'success',
        title: variables.target ? '回复已发布' : '评论已发布',
        description: variables.target
          ? '回复已写入服务端；当前公开接口暂不支持展开楼中楼历史。'
          : undefined,
      });
    },
    onError: () => showToast({ tone: 'error', title: '评论发布失败', description: '请稍后重试。' }),
  });

  const startReply = (target: ReplyTarget) => {
    setReplyTo(target);
    editorRef.current?.focus();
  };

  const submitComment = () => {
    const bodyText = reply.trim();
    if (!bodyText || createComment.isPending) return;
    createComment.mutate({ bodyText, target: replyTo });
  };

  const tags = post.data?.tags ?? [];
  const canComment = Boolean(currentUser && post.data?.permissions.canComment);

  return (
    <PageLayout
      aside={
        <>
          <SideCard title="帖子信息">
            <ul>
              <li>{post.data?.permissions.canComment ? '允许评论' : '当前不可评论'}</li>
              <li>{post.data?.permissions.canQuote ? '允许引用' : '不可引用'}</li>
              <li>{post.data?.permissions.canRepost ? '允许转发' : '不可转发'}</li>
            </ul>
          </SideCard>
          {tags.length ? (
            <SideCard title="相关话题">
              <PostTagLinks tags={tags} className={styles.tagList} />
            </SideCard>
          ) : null}
          <SideCard title="内容安全">
            <p className={styles.safetyText}>
              <ShieldCheck size={15} />
              评论删除或隐藏后会保留时间线占位，不会错误重排对话关系。
            </p>
          </SideCard>
        </>
      }
    >
      <Stack>
        <div className={styles.backbar}>
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> 返回
          </button>
          <strong>帖子详情</strong>
          <span />
        </div>

        {post.isLoading ? (
          <LoadingRows count={1} />
        ) : post.data ? (
          <PostCard post={{ ...post.data, variant: 'detail' }} />
        ) : (
          <Card>
            <EmptyPanel
              icon={<MessageCircle size={24} />}
              title="帖子不可用"
              description="内容可能已删除、转为私密，或你没有查看权限。"
              action={<Button onClick={() => navigate('/home')}>返回首页</Button>}
            />
          </Card>
        )}

        <Card className={styles.reply}>
          <header>
            <Avatar
              fallback={currentUser?.displayName.slice(0, 1) ?? '我'}
              alt={currentUser?.displayName ?? '当前用户'}
              src={currentUser?.avatarUrl}
            />
            <div>
              <strong>{replyTo ? `回复 ${replyTo.name}` : '参与讨论'}</strong>
              <p>{replyTo ? '回复会挂载到所选评论下方' : '保持友善，围绕帖子内容展开交流'}</p>
            </div>
            {replyTo ? (
              <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                取消回复
              </Button>
            ) : null}
          </header>
          <textarea
            aria-label={replyTo ? `回复 ${replyTo.name}` : '发表评论'}
            ref={editorRef}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={
              canComment
                ? replyTo
                  ? `回复 ${replyTo.name}…`
                  : '写下你的回复…'
                : currentUser
                  ? '当前帖子不允许评论'
                  : '登录后参与讨论'
            }
            maxLength={2000}
            disabled={!canComment}
          />
          <footer>
            <div>
              <IconButton
                size="sm"
                label="添加表情"
                icon={<Smile size={17} />}
                disabled={!canComment}
                onClick={() => setReply((value) => `${value}${value ? ' ' : ''}🙂`)}
              />
              <span>评论将遵循帖子的可见性与互动权限</span>
            </div>
            <Button
              size="sm"
              disabled={!canComment || !reply.trim()}
              loading={createComment.isPending}
              onClick={submitComment}
            >
              <Send size={14} /> {replyTo ? '发送回复' : '发送评论'}
            </Button>
          </footer>
        </Card>

        <section className={styles.commentSection}>
          <header>
            <h2>
              <MessageCircle size={18} /> 全部评论{' '}
              <span>{post.data?.stats.comments ?? comments.length}</span>
            </h2>
            <span className={styles.orderLabel}>按发布时间</span>
          </header>

          {degradedReasons.size > 0 ? (
            <div className={styles.degradedNotice} role="status">
              部分评论卡片暂不可用
              {filteredCountHint > 0 ? `，本次省略 ${filteredCountHint} 条` : ''}
              ；删除或隐藏项仍保留占位。
            </div>
          ) : null}

          {replies.isLoading ? <LoadingRows count={3} compact /> : null}
          {replies.isError ? (
            <EmptyPanel
              title="评论加载失败"
              description="服务恢复后可以重新读取，已发布内容不会丢失。"
              action={
                <Button variant="secondary" onClick={() => void replies.refetch()}>
                  重新加载
                </Button>
              }
            />
          ) : null}

          {!replies.isLoading && !replies.isError ? (
            <div className={styles.comments}>
              {comments.map((comment) => (
                <CommentRow
                  key={comment.relation.commentId}
                  item={comment}
                  rootPostId={postId}
                  onReply={startReply}
                />
              ))}
              {!comments.length ? (
                <div className={styles.commentEmpty}>
                  <MessageCircle size={24} />
                  <strong>还没有评论</strong>
                  <p>成为第一个参与讨论的人。</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {replies.hasNextPage ? (
            <Button
              variant="secondary"
              className={styles.more}
              loading={replies.isFetchingNextPage}
              onClick={() => void replies.fetchNextPage()}
            >
              加载更多评论
            </Button>
          ) : null}
        </section>
      </Stack>
    </PageLayout>
  );
}
