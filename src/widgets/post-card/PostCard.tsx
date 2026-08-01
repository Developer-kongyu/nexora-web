import { MoreHorizontal, Pin, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostViewModel } from '@/domains/posts';
import { paths } from '@/shared/config/paths';
import { useCopyTextFeedback } from '@/shared/hooks/useCopyTextFeedback';
import { formatRelativeTime } from '@/shared/lib/format';
import { getUrlHostname } from '@/shared/lib/url';
import { Avatar, Badge, Card, IconButton } from '@/shared/ui';
import { PostActionBar } from './PostActionBar';
import { PostTagLinks } from './PostTagLinks';
import styles from './PostCard.module.css';

export function PostCard({ post, pinned = false }: { post: PostViewModel; pinned?: boolean }) {
  const [menu, setMenu] = useState(false);
  const authorProfileAvailable = post.authorProfileAvailable !== false;

  const copyLink = useCopyTextFeedback({
    successTitle: '帖子链接已复制',
    errorDescription: '请从浏览器地址栏复制链接。',
  });

  return (
    <Card className={styles.card}>
      <article>
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
              {authorProfileAvailable ? <ShieldCheck size={14} className={styles.verified} /> : null}
              {post.community ? (
                <Link to={paths.community(post.community.slug)}>
                  <Badge tone="brand">{post.community.name}</Badge>
                </Link>
              ) : null}
            </div>
            <span>
              {authorProfileAvailable ? `@${post.author.handle}` : '用户资料不可用'} ·{' '}
              {formatRelativeTime(post.createdAt)}
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
                    void copyLink(`${window.location.origin}${paths.post(post.id)}`);
                  }}
                >
                  复制链接
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className={styles.body}>
          <Link to={paths.post(post.id)} className={styles.content}>
            {post.content}
          </Link>
          <PostTagLinks tags={post.tags} className={styles.tags} />
          {post.media.length ? (
            <div className={styles.mediaGrid} data-count={Math.min(post.media.length, 4)}>
              {post.media.slice(0, 4).map((media, index) => (
                <Link
                  key={media.id}
                  to={paths.postMedia(post.id, index)}
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
