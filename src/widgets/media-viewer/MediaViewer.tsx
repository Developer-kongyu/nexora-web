import { ChevronLeft, ChevronRight, Download, Expand, Pause, Play, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PostViewModel } from '@/domains/posts';
import { Avatar, IconButton, useToast } from '@/shared/ui';
import styles from './MediaViewer.module.css';

interface MediaViewerProps {
  post: PostViewModel;
  initialIndex?: number;
  onClose?: () => void;
}

export function MediaViewer({ post, initialIndex = 0, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, post.media.length - 1)));
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { showToast } = useToast();
  const media = useMemo(() => post.media[index] ?? post.media[0], [index, post.media]);

  const previous = useCallback(() => {
    setPlaying(false);
    setIndex((value) => (value - 1 + post.media.length) % post.media.length);
  }, [post.media.length]);

  const next = useCallback(() => {
    setPlaying(false);
    setIndex((value) => (value + 1) % post.media.length);
  }, [post.media.length]);

  const togglePlayback = useCallback(() => {
    setPlaying((current) => {
      const nextPlaying = !current;
      const video = videoRef.current;
      if (video) {
        try {
          if (nextPlaying) {
            void video.play().catch(() => {
              if (videoRef.current === video) setPlaying(false);
            });
          } else video.pause();
        } catch {
          setPlaying(false);
        }
      }
      return nextPlaying;
    });
  }, []);

  const requestFullscreen = useCallback(() => {
    const stage = stageRef.current;
    const request = stage?.requestFullscreen?.bind(stage);
    if (!request) {
      showToast({ tone: 'info', title: '当前浏览器不支持全屏模式' });
      return;
    }
    void request().catch(() => {
      showToast({ tone: 'error', title: '无法进入全屏模式' });
    });
  }, [showToast]);

  const download = useCallback(() => {
    if (!media) return;
    const ownerDocument = stageRef.current?.ownerDocument ?? document;
    const anchor = ownerDocument.createElement('a');
    anchor.href = media.url;
    anchor.download = media.title || 'media';
    anchor.rel = 'noopener';
    ownerDocument.body.append(anchor);
    anchor.click();
    anchor.remove();
    showToast({ tone: 'success', title: '已开始下载原始媒体' });
  }, [media, showToast]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && post.media.length > 1) previous();
      if (event.key === 'ArrowRight' && post.media.length > 1) next();
      if (event.key === 'Escape') onClose?.();
      if (event.key === ' ' && media?.kind === 'video') {
        event.preventDefault();
        togglePlayback();
      }
    };
    const ownerWindow = stageRef.current?.ownerDocument.defaultView ?? window;
    ownerWindow.addEventListener('keydown', listener);
    return () => ownerWindow.removeEventListener('keydown', listener);
  }, [media?.kind, next, onClose, post.media.length, previous, togglePlayback]);

  if (!media) return null;

  const duration = media.durationSeconds ?? 50;
  const durationLabel = `00:${String(duration).padStart(2, '0')}`;

  return (
    <div className={styles.overlay}>
      <div className={styles.viewer}>
        <main className={styles.stageColumn}>
          <header className={styles.topbar}>
            <div>
              <IconButton label="关闭媒体查看器" icon={<X size={20} />} onClick={onClose} />
              <span>
                {index + 1} / {post.media.length}
              </span>
            </div>
            <div>
              <button type="button" onClick={download}>
                <Download size={17} />
                下载
              </button>
              <button type="button" aria-label="全屏" onClick={requestFullscreen}>
                <Expand size={17} />
                全屏
              </button>
            </div>
          </header>

          <div className={styles.stage} ref={stageRef}>
            {media.kind === 'video' ? (
              <video
                ref={videoRef}
                src={media.url}
                poster={media.posterUrl}
                aria-label={media.alt}
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <img src={media.url} alt={media.alt} />
            )}
            {media.kind === 'video' ? (
              <button
                className={styles.centerPlay}
                type="button"
                onClick={togglePlayback}
                aria-label={playing ? '暂停' : '播放'}
              >
                {playing ? (
                  <Pause size={34} fill="currentColor" />
                ) : (
                  <Play size={34} fill="currentColor" />
                )}
              </button>
            ) : null}
            {post.media.length > 1 ? (
              <>
                <button
                  className={styles.previous}
                  type="button"
                  aria-label="上一张"
                  onClick={previous}
                >
                  <ChevronLeft size={28} />
                </button>
                <button className={styles.next} type="button" aria-label="下一张" onClick={next}>
                  <ChevronRight size={28} />
                </button>
              </>
            ) : null}
          </div>

          {media.kind === 'video' ? (
            <div className={styles.controls}>
              <button
                type="button"
                aria-label={playing ? '暂停控制' : '播放控制'}
                onClick={togglePlayback}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span>00:00</span>
              <div className={styles.progress}>
                <i />
              </div>
              <span>{durationLabel}</span>
              <Volume2 size={18} />
              <button type="button" aria-label="全屏" onClick={requestFullscreen}>
                <Expand size={18} />
              </button>
            </div>
          ) : (
            <div className={styles.imageBar}>
              <span>{media.title}</span>
              <span>使用 ← → 切换，Esc 关闭</span>
            </div>
          )}

          <div className={styles.thumbnails}>
            {post.media.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-label={`查看第 ${itemIndex + 1} 个媒体`}
                data-active={itemIndex === index}
                onClick={() => {
                  setPlaying(false);
                  setIndex(itemIndex);
                }}
              >
                <img src={item.posterUrl || item.url} alt={item.alt} />
                {item.kind === 'video' ? <Play size={14} fill="currentColor" /> : null}
              </button>
            ))}
          </div>
        </main>

        <aside className={styles.aside}>
          <section className={styles.info}>
            <span className={styles.label}>图片信息</span>
            <h1>{media.title}</h1>
            <p>{media.description}</p>
            <dl>
              <div>
                <dt>媒体类型</dt>
                <dd>{media.kind === 'video' ? '视频' : '图片'}</dd>
              </div>
              <div>
                <dt>当前序号</dt>
                <dd>
                  {index + 1} / {post.media.length}
                </dd>
              </div>
              <div>
                <dt>分辨率</dt>
                <dd>
                  {media.width && media.height ? `${media.width} × ${media.height}` : '原始画质'}
                </dd>
              </div>
            </dl>
          </section>
          <section className={styles.summary}>
            <span className={styles.label}>帖子摘要</span>
            <div className={styles.author}>
              <Avatar
                src={post.author.avatarUrl ?? undefined}
                fallback={post.author.displayName.slice(0, 1)}
                alt={post.author.displayName}
              />
              <span>
                <strong>{post.author.displayName}</strong>
                <small>@{post.author.handle}</small>
              </span>
            </div>
            <p>{post.content}</p>
            <div className={styles.tags}>
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
