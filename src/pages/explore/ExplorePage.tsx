import { useQuery } from '@tanstack/react-query';
import { Compass, Flame, Globe2, Hash } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { communitiesApi, type CommunitySummary } from '@/domains/communities';
import { feedApi, feedKeys, useExploreFeed, type ExplorePostTab } from '@/domains/feed';
import { paths } from '@/shared/config/paths';
import { mergeCursorItems } from '@/shared/api/pagination';
import { useCopyTextFeedback } from '@/shared/hooks/useCopyTextFeedback';
import { formatCount } from '@/shared/lib/format';
import { Badge, Button } from '@/shared/ui';
import { CommunityCard } from '@/widgets/community-card/CommunityCard';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { LoadingRows, SideCard } from '../_shared/PageParts';
import styles from '../_shared/ProductPages.module.css';

const EXPLORE_TABS: ReadonlyArray<{ value: ExplorePostTab; label: string }> = [
  { value: 'HOT', label: '热门' },
  { value: 'IMAGE', label: '图片' },
  { value: 'VIDEO', label: '视频' },
];

const POST_SECTION_COPY: Record<ExplorePostTab, { title: string; description: string }> = {
  HOT: { title: '热门帖子', description: '按后端热门榜单展示的公开内容' },
  IMAGE: { title: '图片帖子', description: '包含可用图片的公开内容' },
  VIDEO: { title: '视频帖子', description: '包含可用视频的公开内容' },
};

function formatSnapshotWindow(start: string | null, end: string | null): string {
  if (!start || !end) return '快照尚未生成';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatter.format(new Date(start))} 至 ${formatter.format(new Date(end))}`;
}

export function ExplorePage() {
  const [tab, setTab] = useState<ExplorePostTab>('HOT');
  const feed = useExploreFeed(tab);
  const posts = feed.data ? mergeCursorItems(feed.data.pages) : [];
  const topics = useQuery({
    queryKey: feedKeys.exploreTopics('HOT_24H'),
    queryFn: ({ signal }) => feedApi.exploreTopics('HOT_24H', 8, signal),
  });
  const communities = useQuery({
    queryKey: feedKeys.exploreCommunities('FEATURED_BY_INTEREST'),
    queryFn: async ({ signal }) => {
      const response = await feedApi.exploreCommunities('FEATURED_BY_INTEREST', 6, signal);
      const membership = await communitiesApi
        .getMembershipStates(
          response.list.map((item) => item.card.communityId),
          signal,
        )
        .catch(() => ({ list: response.list.map(() => null) }));
      return {
        ...response,
        list: response.list.map(({ card }, index): CommunitySummary => ({
          id: card.communityId,
          slug: card.slug,
          name: card.name,
          description: card.description ?? '',
          avatarUrl: card.avatarUrl,
          membersCount: card.memberCount,
          joined: membership.list[index]?.joined ?? false,
        })),
      };
    },
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
          <SideCard title="实时数据">
            <ul>
              <li>
                话题窗口：
                {topics.isLoading
                  ? '读取中'
                  : formatSnapshotWindow(
                      topics.data?.windowStartedAtIso ?? null,
                      topics.data?.windowEndedAtIso ?? null,
                    )}
              </li>
              <li>热门话题：{topics.isError ? '加载失败' : `${topics.data?.list.length ?? 0} 个`}</li>
              <li>
                推荐社群：
                {communities.isError ? '加载失败' : `${communities.data?.list.length ?? 0} 个`}
              </li>
            </ul>
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
                key={item.value}
                className={tab === item.value ? styles.active : undefined}
                onClick={() => setTab(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className={styles.toolbarLabel}>
            <Compass size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> 探索公开内容
          </span>
        </div>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>
                <Flame size={18} color="#ef4444" /> 热门话题
              </h2>
              <p>来自后端过去 24 小时的话题快照</p>
            </div>
          </header>
          <div className={styles.sectionBody}>
            {topics.isLoading ? (
              <LoadingRows count={2} compact />
            ) : topics.isError ? (
              <div className={styles.emptyPanel}>
                <h2>热门话题加载失败</h2>
                <p>后端话题快照暂时无法读取。</p>
                <Button size="sm" variant="secondary" onClick={() => void topics.refetch()}>
                  重新加载
                </Button>
              </div>
            ) : !topics.data || topics.data.list.length === 0 ? (
              <div className={styles.emptyPanel}>
                <span className={styles.emptyIcon}>
                  <Hash size={22} />
                </span>
                <h2>暂无热门话题</h2>
                <p>后端当前没有可展示的话题快照。</p>
              </div>
            ) : (
              <div className={styles.cardGrid}>
                {topics.data.list.map((topic) => (
                  <Link
                    key={topic.hashtagNormalized}
                    to={paths.searchResults(topic.hashtagText)}
                    className={styles.featureCard}
                    style={{ minHeight: 105 }}
                  >
                    <span className={styles.featureCardIcon}>
                      <Hash size={18} />
                    </span>
                    <h3>#{topic.hashtagText}</h3>
                    <p>
                      {formatCount(topic.postCount24h)} 条帖子 ·{' '}
                      {formatCount(topic.contributorCount24h)} 位创作者
                    </p>
                    <Badge
                      tone="neutral"
                      style={{ position: 'absolute', right: 14, bottom: 14 }}
                    >
                      第 {topic.rankPosition} 位
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader} style={{ padding: '0 2px 12px', border: 0 }}>
            <div>
              <h2>{POST_SECTION_COPY[tab].title}</h2>
              <p>{POST_SECTION_COPY[tab].description}</p>
            </div>
          </div>
          {feed.isLoading ? (
            <LoadingRows count={2} />
          ) : feed.isError ? (
            <div className={styles.emptyPanel}>
              <h2>帖子加载失败</h2>
              <p>当前分类暂时无法从后端读取。</p>
              <Button size="sm" variant="secondary" onClick={() => void feed.refetch()}>
                重新加载
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.emptyPanel}>
              <span className={styles.emptyIcon}>
                <Compass size={22} />
              </span>
              <h2>当前分类暂无内容</h2>
              <p>
                后端没有返回可展示的
                {EXPLORE_TABS.find((item) => item.value === tab)?.label}
                帖子。
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 14 }}>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              {feed.hasNextPage ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
                  <Button
                    variant="secondary"
                    loading={feed.isFetchingNextPage}
                    onClick={() => void feed.fetchNextPage()}
                  >
                    加载更多
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>

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
            ) : communities.isError ? (
              <div className={styles.emptyPanel}>
                <h2>推荐社群加载失败</h2>
                <p>后端推荐榜单暂时无法读取。</p>
                <Button size="sm" variant="secondary" onClick={() => void communities.refetch()}>
                  重新加载
                </Button>
              </div>
            ) : !communities.data || communities.data.list.length === 0 ? (
              <div className={styles.emptyPanel}>
                <h2>暂无推荐社群</h2>
                <p>后端当前没有可展示的推荐社群快照。</p>
              </div>
            ) : (
              communities.data.list.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))
            )}
          </div>
        </section>
      </Stack>
    </PageLayout>
  );
}
