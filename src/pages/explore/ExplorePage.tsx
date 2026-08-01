import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  Flame,
  Globe2,
  Hash,
  MapPin,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { communitiesApi, communityKeys } from '@/domains/communities';
import { useExploreFeed } from '@/domains/feed';
import { paths } from '@/shared/config/paths';
import { mergeCursorItems } from '@/shared/api/pagination';
import { useCopyTextFeedback } from '@/shared/hooks/useCopyTextFeedback';
import { Badge, Button } from '@/shared/ui';
import { CommunityCard } from '@/widgets/community-card/CommunityCard';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { LoadingRows, SideCard } from '../_shared/PageParts';
import styles from '../_shared/ProductPages.module.css';

const EXPLORE_TABS = ['热门', '最新', '图片', '视频'] as const;
type ExploreTab = (typeof EXPLORE_TABS)[number];

const topics = [
  { name: '人工智能', count: '12.3万', growth: '+32%', tone: 'brand' as const },
  { name: '城市摄影', count: '3.9万', growth: '+18%', tone: 'success' as const },
  { name: '独立开发', count: '2.7万', growth: '+16%', tone: 'warning' as const },
  { name: '旅行灵感', count: '5.1万', growth: '+12%', tone: 'neutral' as const },
];

export function ExplorePage() {
  const [tab, setTab] = useState<ExploreTab>('热门');
  const feed = useExploreFeed();
  const posts = feed.data ? mergeCursorItems(feed.data.pages) : [];
  const communities = useQuery({
    queryKey: communityKeys.explore,
    queryFn: () => communitiesApi.list(),
  });

  const copyExploreLink = useCopyTextFeedback({ successTitle: '访客链接已复制' });

  return (
    <PageLayout
      aside={
        <>
          <SideCard title="匿名浏览">
            <div
              style={{
                display: 'grid',
                justifyItems: 'center',
                gap: 10,
                padding: '8px 0 4px',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 48,
                  height: 48,
                  color: 'var(--color-primary)',
                  background: 'var(--color-primary-soft)',
                  borderRadius: 15,
                }}
              >
                <Globe2 size={22} />
              </span>
              <p>未登录用户也可浏览公开内容，互动时再登录。</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void copyExploreLink(`${window.location.origin}/explore`)}
              >
                复制访客链接
              </Button>
            </div>
          </SideCard>
          <SideCard title="趋势来源">
            <ul>
              <li>过去 2 小时互动增长</li>
              <li>与你的兴趣标签相关</li>
              <li>已过滤不可见与低质量内容</li>
            </ul>
          </SideCard>
          <SideCard title="正在发生">
            <div className={styles.list}>
              <div className={styles.listRow} style={{ padding: '10px 0' }}>
                <span className={styles.featureCardIcon}>
                  <MapPin size={16} />
                </span>
                <span className={styles.listCopy}>
                  <strong>上海 · 创意市集</strong>
                  <small>326 人正在讨论</small>
                </span>
              </div>
              <div className={styles.listRow} style={{ padding: '10px 0' }}>
                <span className={styles.featureCardIcon}>
                  <Sparkles size={16} />
                </span>
                <span className={styles.listCopy}>
                  <strong>AI 创作周</strong>
                  <small>今晚 20:00 线上分享</small>
                </span>
              </div>
            </div>
          </SideCard>
        </>
      }
    >
      <Stack>
        <div className={styles.toolbar}>
          <div className={styles.pillTabs}>
            {EXPLORE_TABS.map((item) => (
              <button
                type="button"
                key={item}
                className={tab === item ? styles.active : undefined}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <span className={styles.toolbarLabel}>
            <Compass size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
            探索公开内容
          </span>
        </div>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>
                <Flame size={18} color="#ef4444" /> 热门话题
              </h2>
              <p>实时讨论热度与增长趋势</p>
            </div>
            <Link to="/search?q=热门">查看完整榜单</Link>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.cardGrid}>
              {topics.map((topic, index) => (
                <Link
                  key={topic.name}
                  to={paths.searchResults(topic.name)}
                  className={styles.featureCard}
                  style={{ minHeight: 105 }}
                >
                  <span className={styles.featureCardIcon}>
                    {index < 2 ? <TrendingUp size={18} /> : <Hash size={18} />}
                  </span>
                  <h3>#{topic.name}</h3>
                  <p>{topic.count} 条讨论</p>
                  <Badge
                    tone={topic.tone}
                    style={{ position: 'absolute', right: 14, bottom: 14 }}
                  >
                    {topic.growth}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {feed.isLoading ? (
          <LoadingRows count={2} />
        ) : (
          <section>
            <div
              className={styles.sectionHeader}
              style={{ padding: '0 2px 12px', border: 0 }}
            >
              <div>
                <h2>热门帖子</h2>
                <p>高质量公开内容</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>精选社群</h2>
              <p>找到持续交流的兴趣空间</p>
            </div>
            <Link to="/communities">发现更多</Link>
          </header>
          <div className={styles.sectionBody} style={{ display: 'grid', gap: 12 }}>
            {communities.isLoading ? (
              <LoadingRows count={2} compact />
            ) : (
              communities.data?.list.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))
            )}
          </div>
        </section>
      </Stack>
    </PageLayout>
  );
}
