import { Filter, SearchX, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSearch, type SearchTab } from '@/domains/search';
import { Button, Select, Switch } from '@/shared/ui';
import { CommunityCard } from '@/widgets/community-card/CommunityCard';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { UserCard } from '@/widgets/user-card/UserCard';
import { EmptyPanel, LoadingRows, SideCard } from '../_shared/PageParts';
import styles from '../_shared/ProductPages.module.css';

export function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '人工智能';
  const tab = (params.get('tab') || 'posts') as SearchTab;
  const sort = params.get('sort') || 'relevance';
  const [timeRange, setTimeRange] = useState('all');
  const [language, setLanguage] = useState('all');
  const [mediaOnly, setMediaOnly] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);

  const result = useSearch(query, tab, sort);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

  const filtered = useMemo(() => {
    const data = result.data;
    if (!data) return { posts: [], users: [], communities: [] };

    const referenceTime = result.dataUpdatedAt;
    const maxAgeByRange: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const posts = data.posts.list.filter((post) => {
      const maxAge = maxAgeByRange[timeRange];
      const publishedAt = Date.parse(post.createdAt);
      const matchesTime =
        !maxAge ||
        !Number.isFinite(publishedAt) ||
        referenceTime === 0 ||
        referenceTime - publishedAt <= maxAge;
      const matchesMedia = !mediaOnly || post.media.length > 0;
      const matchesFollowing = !followingOnly || Boolean(post.author.isFollowing);
      return matchesTime && matchesMedia && matchesFollowing;
    });

    const users = data.users.list.filter((user) => !followingOnly || Boolean(user.isFollowing));

    return {
      posts,
      users,
      communities: data.communities.list,
    };
  }, [followingOnly, mediaOnly, result.data, result.dataUpdatedAt, timeRange]);

  const count =
    tab === 'posts'
      ? filtered.posts.length
      : tab === 'users'
        ? filtered.users.length
        : filtered.communities.length;

  const clearFilters = () => {
    setTimeRange('all');
    setLanguage('all');
    setMediaOnly(false);
    setFollowingOnly(false);
    set('sort', 'relevance');
  };

  return (
    <PageLayout
      aside={
        <>
          <SideCard title="结果筛选">
            <div style={{ display: 'grid', gap: 14 }}>
              <Select
                label="发布时间"
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value)}
              >
                <option value="all">不限时间</option>
                <option value="24h">过去 24 小时</option>
                <option value="7d">过去一周</option>
                <option value="30d">过去一个月</option>
              </Select>
              <Select
                label="内容语言"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option value="all">全部语言</option>
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </Select>
              <Switch
                compact
                label="包含媒体"
                description="仅展示包含图片或视频的帖子"
                checked={mediaOnly}
                onChange={(event) => setMediaOnly(event.target.checked)}
              />
              <Switch
                compact
                label="仅看已关注"
                description="过滤为你已关注的创作者"
                checked={followingOnly}
                onChange={(event) => setFollowingOnly(event.target.checked)}
              />
            </div>
          </SideCard>
          <SideCard title="权限说明">
            <ul>
              <li>只展示当前账号有权查看的内容</li>
              <li>已删除或被屏蔽的内容不会出现在结果中</li>
              <li>排序结果来自统一搜索服务</li>
            </ul>
          </SideCard>
          <SideCard title="没有找到？">
            <p>尝试更短的关键词，或清除发布时间、语言和关系筛选。</p>
            <Button size="sm" variant="secondary" style={{ marginTop: 12 }} onClick={clearFilters}>
              清除全部筛选
            </Button>
          </SideCard>
        </>
      }
    >
      <Stack>
        <div className={styles.toolbar}>
          <div className={styles.pillTabs}>
            <button
              type="button"
              className={tab === 'posts' ? styles.active : undefined}
              onClick={() => set('tab', 'posts')}
            >
              帖子
            </button>
            <button
              type="button"
              className={tab === 'users' ? styles.active : undefined}
              onClick={() => set('tab', 'users')}
            >
              用户
            </button>
            <button
              type="button"
              className={tab === 'communities' ? styles.active : undefined}
              onClick={() => set('tab', 'communities')}
            >
              社群
            </button>
          </div>
          <span className={styles.toolbarLabel}>
            “{query}” · {count} 条结果
          </span>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <Filter size={17} />
            <strong>搜索结果</strong>
            <span className={styles.toolbarLabel}>
              已按可见权限过滤{language !== 'all' ? ` · ${language}` : ''}
            </span>
          </div>
          <div className={styles.toolbarGroup}>
            <SlidersHorizontal size={15} />
            <Select
              aria-label="排序方式"
              label="排序方式"
              value={sort}
              onChange={(event) => set('sort', event.target.value)}
            >
              <option value="relevance">相关度</option>
              <option value="latest">最新发布</option>
              <option value="popular">互动最多</option>
            </Select>
          </div>
        </div>

        {result.isLoading ? <LoadingRows count={3} /> : null}

        {!result.isLoading && count === 0 ? (
          <section className={styles.section}>
            <EmptyPanel
              icon={<SearchX size={24} />}
              title={`没有找到“${query}”`}
              description="换个关键词，或者清除筛选条件后再试。"
              action={
                <Button variant="secondary" onClick={() => navigate('/explore')}>
                  浏览热门内容
                </Button>
              }
            />
          </section>
        ) : null}

        {tab === 'posts' && count ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {filtered.posts.map((post) => (
              <PostCard key={post.id} post={{ ...post, variant: 'search' }} />
            ))}
          </div>
        ) : null}

        {tab === 'users' && count ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        ) : null}

        {tab === 'communities' && count ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        ) : null}
      </Stack>
    </PageLayout>
  );
}
