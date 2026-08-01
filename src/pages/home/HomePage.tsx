import { Hash, RefreshCw, TrendingUp, UsersRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { CommunitySummary } from '@/domains/communities';
import { useFeed, type FeedTab } from '@/domains/feed';
import type { UserSummary } from '@/domains/users';
import { mergeCursorItems } from '@/shared/api/pagination';
import { paths } from '@/shared/config/paths';
import { Button } from '@/shared/ui';
import { CommunityCard } from '@/widgets/community-card/CommunityCard';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { UserCard } from '@/widgets/user-card/UserCard';
import { LoadingRows, Notice, QuickCompose, SideCard } from '../_shared/PageParts';
import styles from '../_shared/ProductPages.module.css';

const SUGGESTED_USERS: UserSummary[] = [
  {
    id: 'suggested-design',
    handle: 'design_lin',
    displayName: '设计师小李',
    avatarUrl: null,
    bio: '交互设计与设计系统',
    followersCount: 1_200,
  },
  {
    id: 'suggested-music',
    handle: 'music_chen',
    displayName: '陈野声',
    avatarUrl: null,
    bio: '独立音乐与现场记录',
    followersCount: 3_500,
  },
  {
    id: 'suggested-food',
    handle: 'city_table',
    displayName: '城市餐桌',
    avatarUrl: null,
    bio: '记录街区里的小店',
    followersCount: 8_900,
  },
];

const SUGGESTED_COMMUNITY: CommunitySummary = {
  id: 'pm-lab',
  slug: 'pm-lab',
  name: '产品经理交流圈',
  description: '需求、增长、路线图与团队协作。',
  avatarUrl: null,
  membersCount: 8_700,
};

const TRENDING_TOPICS = [
  ['人工智能', '12.3万讨论'],
  ['产品设计', '8.7万讨论'],
  ['程序员日常', '6.1万讨论'],
  ['城市摄影', '3.9万讨论'],
] as const;

export function HomePage() {
  const [params] = useSearchParams();
  const tab: FeedTab = params.get('tab') === 'for-you' ? 'for-you' : 'following';
  const feed = useFeed(tab);
  const posts = feed.data ? mergeCursorItems(feed.data.pages) : [];

  const aside = (
    <>
      <SideCard title="推荐关注" action="换一批" to={paths.explore}>
        {SUGGESTED_USERS.map((user) => (
          <UserCard key={user.id} user={user} compact />
        ))}
      </SideCard>

      <SideCard title="热门话题" action="查看全部" to={paths.explore}>
        <div style={{ display: 'grid', gap: 2 }}>
          {TRENDING_TOPICS.map(([name, count], index) => (
            <Link
              key={name}
              to={paths.searchResults(name)}
              className={styles.listRow}
              style={{ padding: '10px 0' }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 30,
                  height: 30,
                  color: 'var(--color-primary)',
                  background: 'var(--color-primary-soft)',
                  borderRadius: 9,
                }}
              >
                {index < 2 ? <TrendingUp size={15} /> : <Hash size={15} />}
              </span>
              <span className={styles.listCopy}>
                <strong>#{name}</strong>
                <small>{count}</small>
              </span>
            </Link>
          ))}
        </div>
      </SideCard>

      <SideCard title="推荐社群" action="更多" to={paths.communities}>
        <CommunityCard community={SUGGESTED_COMMUNITY} />
      </SideCard>

      <p
        style={{
          padding: '0 10px',
          color: 'var(--color-subtle)',
          fontSize: 10,
          lineHeight: 1.7,
        }}
      >
        关于 · 帮助 · 隐私 · 服务条款
        <br />© 2026 LCT Circle
      </p>
    </>
  );

  return (
    <PageLayout aside={aside}>
      <Stack>
        <div className={styles.toolbar}>
          <div className={styles.pillTabs}>
            <Link
              className={tab === 'following' ? styles.active : undefined}
              to={`${paths.home}?tab=following`}
            >
              正在关注
            </Link>
            <Link
              className={tab === 'for-you' ? styles.active : undefined}
              to={`${paths.home}?tab=for-you`}
            >
              为你推荐
            </Link>
          </div>
          <span className={styles.toolbarLabel}>
            {tab === 'following' ? '来自你关注的人' : '基于兴趣与互动排序'}
          </span>
        </div>

        <QuickCompose />

        <Notice
          action={
            <button type="button" onClick={() => void feed.refetch()}>
              <RefreshCw size={13} />
              刷新
            </button>
          }
        >
          时间线可能有新内容，刷新后将插入到顶部。
        </Notice>

        {feed.isLoading ? (
          <LoadingRows />
        ) : feed.isError ? (
          <Notice
            tone="danger"
            action={
              <button type="button" onClick={() => void feed.refetch()}>
                <RefreshCw size={13} />
                重新加载
              </button>
            }
          >
            动态加载失败，请检查网络连接后重试。
          </Notice>
        ) : posts.length ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Notice>当前时间线暂无内容，关注创作者或切换到“为你推荐”看看。</Notice>
        )}

        {!feed.isError && feed.hasNextPage ? (
          <Button
            variant="secondary"
            loading={feed.isFetchingNextPage}
            onClick={() => void feed.fetchNextPage()}
          >
            加载更多内容
          </Button>
        ) : !feed.isError && posts.length ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: 16,
              color: 'var(--color-muted)',
              fontSize: 12,
            }}
          >
            <UsersRound size={15} />
            已查看全部最新动态
          </div>
        ) : null}
      </Stack>
    </PageLayout>
  );
}
