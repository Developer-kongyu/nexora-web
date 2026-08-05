import { MessageCircle, MoreHorizontal, Pin, Repeat2, ShieldCheck } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePostImpression, type ImpressionScene } from '@/domains/engagement';
import type { PostViewModel } from '@/domains/posts';
import { paths } from '@/shared/config/paths';
import { useCopyTextFeedback } from '@/shared/hooks/useCopyTextFeedback';
import { formatRelativeTime } from '@/shared/lib/format';
import { getUrlHostname } from '@/shared/lib/url';
import { Avatar, Badge, Card, IconButton } from '@/shared/ui';
import { PostActionBar } from './PostActionBar';
import { PostRichText } from './PostRichText';
import styles from './PostCard.module.css';

export function PostCard({ post, pinned = false }: { post: PostViewModel; pinned?: boolean }) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const impressionScene: ImpressionScene =
    post.variant === 'detail'
      ? 'DETAIL'
      : post.variant === 'search'
        ? 'SEARCH'
        : post.variant === 'community'
          ? 'COMMUNITY'
          : post.variant === 'profile' ||
              post.variant === 'bookmark' ||
              post.variant === 'announcement'
            ? 'PROFILE'
            : 'FEED';
  const impressionRef = usePostImpression(post.id, impressionScene);
  const authorProfileAvailable = post.authorProfileAvailable !== false;
  const contentPostId = post.contentPostId ?? post.id;
  const detailPostId = post.postKind === 'REPLY' ? post.id : contentPostId;
  const relationDisplayUser =
    post.relation?.kind === 'REPLY' ? post.relation.targetAuthor : post.relation?.actor;
  const relationDisplayUserProfileAvailable =
    post.relation?.kind === 'REPLY'
      ? post.relation.targetProfileAvailable
      : post.relation?.actorProfileAvailable;

  const openPostDetail = (event: MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('a, button, input, textarea, select, [role="button"]')
    ) {
      return;
    }

    void navigate(paths.post(detailPostId));
  };

  const copyLink = useCopyTextFeedback({
    successTitle: '帖子链接已复制',
    errorDescription: '请从浏览器地址栏复制链接。',
  });

  return (
    <Card className={styles.card}>
      <article ref={impressionRef} className={styles.clickableArticle} onClick={openPostDetail}>
        {post.relation ? (
          <div className={styles.relationLabel} data-kind={post.relation.kind}>
            {post.relation.kind === 'REPOST' ? <Repeat2 size={14} /> : <MessageCircle size={14} />}
            {post.relation.kind === 'REPLY' ? <span>回复了</span> : null}
            {relationDisplayUser && relationDisplayUserProfileAvailable !== false ? (
              <Link to={paths.profile(relationDisplayUser.handle)}>
                {post.relation.kind === 'REPLY'
                  ? `@${relationDisplayUser.handle}`
                  : relationDisplayUser.displayName}
              </Link>
            ) : (
              <strong>
                {post.relation.kind === 'REPLY'
                  ? post.relation.targetProfileAvailable === false
                    ? '用户不存在'
                    : '回复对象暂不可用'
                  : (relationDisplayUser?.displayName ?? '原内容')}
              </strong>
            )}
            {post.relation.kind === 'REPOST' ? <span>转发了</span> : null}
          </div>
        ) : null}
        {pinned ? (
          <div className={styles.pinned}>
            <Pin size={13} />
            置顶帖子
          </div>
        ) : null}
        <header className={styles.header}>
          {authorProfileAvailable ? (
            <Link to={paths.profile(post.author.handle)}>
              <Avatar
                fallback={post.author.displayName.slice(0, 1)}
                alt={post.author.displayName}
                src={post.author.avatarUrl}
              />
            </Link>
          ) : (
            <span className={styles.unavailableAvatar}>
              <Avatar
                fallback={post.author.displayName.slice(0, 1)}
                alt={post.author.displayName}
                src={post.author.avatarUrl}
              />
            </span>
          )}
          <div className={styles.author}>
            <div className={styles.authorLine}>
              {authorProfileAvailable ? (
                <Link to={paths.profile(post.author.handle)}>
                  <strong>{post.author.displayName}</strong>
                </Link>
              ) : (
                <strong>{post.author.displayName}</strong>
              )}
              {authorProfileAvailable ? (
                <ShieldCheck size={14} className={styles.verified} />
              ) : null}
              {post.community ? (
                <Link to={paths.community(post.community.slug)}>
                  <Badge tone="brand">{post.community.name}</Badge>
                </Link>
              ) : null}
            </div>
            <span>
              {authorProfileAvailable ? `@${post.author.handle}` : '用户资料不可用'} ·{' '}
              <Link
                className={styles.detailTime}
                to={paths.post(detailPostId)}
                title={post.postKind === 'REPLY' ? '查看回复详情' : '查看帖子详情'}
              >
                {formatRelativeTime(post.createdAt)}
              </Link>
            </span>
          </div>
          <div className={styles.menuWrap}>
            <IconButton
              size="sm"
              label="帖子菜单"
              icon={<MoreHorizontal size={18} />}
              onClick={() => setMenu((value) => !value)}
            />
            {menu ? (
              <div className={styles.menu}>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    void copyLink(`${window.location.origin}${paths.post(detailPostId)}`);
                  }}
                >
                  复制链接
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className={styles.body}>
          <PostRichText text={post.content} className={styles.content} />
          {post.media.length ? (
            <div className={styles.mediaGrid} data-count={Math.min(post.media.length, 4)}>
              {post.media.slice(0, 4).map((media, index) => (
                <Link
                  key={media.id}
                  to={paths.postMedia(detailPostId, index)}
                  className={styles.media}
                >
                  <img src={media.posterUrl || media.url} alt={media.alt} />
                  {media.kind === 'video' ? (
                    <span className={styles.videoBadge}>
                      ▶ {media.durationSeconds ? `${media.durationSeconds}s` : '视频'}
                    </span>
                  ) : null}
                  {index === 3 && post.media.length > 4 ? (
                    <span className={styles.moreMedia}>+{post.media.length - 4}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
          {post.linkPreview ? (
            <a
              className={styles.linkPreview}
              href={post.linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {post.linkPreview.imageUrl ? <img src={post.linkPreview.imageUrl} alt="" /> : null}
              <span>
                <small>{getUrlHostname(post.linkPreview.url)}</small>
                <strong>{post.linkPreview.title}</strong>
                <p>{post.linkPreview.description}</p>
              </span>
            </a>
          ) : null}
        </div>
        <PostActionBar post={post} />
      </article>
    </Card>
  );
}
