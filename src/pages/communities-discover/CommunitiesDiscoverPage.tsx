import { useInfiniteQuery } from '@tanstack/react-query';
import { Compass, Plus, Search, Sparkles, TrendingUp, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communitiesApi, communityKeys } from '@/domains/communities';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { Badge, Button, Card, Select } from '@/shared/ui';
import { CommunityCard } from '@/widgets/community-card/CommunityCard';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { EmptyPanel, LoadingRows, SideCard } from '../_shared/PageParts';
import styles from './CommunitiesDiscoverPage.module.css';

const categories = [
  '全部分类',
  '产品与设计',
  '人工智能',
  '摄影与旅行',
  '软件开发',
  '生活方式',
  '阅读与写作',
];

export function CommunitiesDiscoverPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('发现');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部分类');

  const query = useInfiniteQuery({
    queryKey: communityKeys.discover,
    queryFn: ({ pageParam }) => communitiesApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });

  const communities = useMemo(() => {
    const allCommunities = query.data?.pages.flatMap((page) => page.list) ?? [];
    const categoryByIndex = ['人工智能', '产品与设计', '摄影与旅行'];
    const normalized = keyword.trim().toLowerCase();
    let result = allCommunities.filter((community, index) => {
      const matchesKeyword =
        !normalized ||
        community.name.toLowerCase().includes(normalized) ||
        community.description.toLowerCase().includes(normalized);
      const itemCategory = categoryByIndex[index % categoryByIndex.length];
      const matchesCategory = category === '全部分类' || itemCategory === category;
      const matchesTab = tab !== '已加入' || community.joined;
      return matchesKeyword && matchesCategory && matchesTab;
    });

    if (tab === '热门') result = [...result].sort((a, b) => b.membersCount - a.membersCount);
    if (tab === '最新') result = [...result].reverse();
    return result;
  }, [category, keyword, query.data, tab]);

  return (
    <PageLayout
      aside={
        <>
          <SideCard title="热门分类">
            <div className={styles.categories}>
              {categories.slice(1).map((item, index) => (
                <button
                  type="button"
                  key={item}
                  data-active={category === item}
                  onClick={() => setCategory((value) => (value === item ? '全部分类' : item))}
                >
                  <span>{index < 2 ? <TrendingUp size={15} /> : <Compass size={15} />}</span>
                  {item}
                </button>
              ))}
            </div>
          </SideCard>
          <SideCard title="为什么加入社群">
            <ul>
              <li>获得稳定的主题内容与讨论</li>
              <li>参与活动、问答和内容共创</li>
              <li>与同领域创作者建立长期连接</li>
            </ul>
          </SideCard>
          <SideCard title="社群规范">
            <p>每个社群可设置独立的加入、发帖和审核规则。加入前请阅读社群说明。</p>
          </SideCard>
        </>
      }
    >
      <Stack>
        <section className={styles.hero}>
          <div>
            <span>
              <Sparkles size={15} /> 找到同频的兴趣社区
            </span>
            <h1>把一次讨论，变成长期连接。</h1>
            <p>加入高质量社群，发现真实经验、持续创作和共同成长的伙伴。</p>
            <div>
              <Button onClick={() => navigate('/communities/new')}>
                <Plus size={16} /> 创建社群
              </Button>
              <Button variant="secondary" onClick={() => setTab('已加入')}>
                查看我的社群
              </Button>
            </div>
          </div>
          <span className={styles.heroArt}>
            <UsersRound size={58} />
            <i />
            <b />
          </span>
        </section>

        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            {['发现', '已加入', '热门', '最新'].map((item) => (
              <button
                type="button"
                key={item}
                data-active={tab === item}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className={styles.search}>
            <Search size={16} />
            <input
              aria-label="搜索社群名称或话题"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索社群名称或话题"
            />
          </label>
          <Select
            label="分类"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </div>

        {query.isLoading ? (
          <LoadingRows count={3} />
        ) : communities.length ? (
          <>
            <section>
              <header className={styles.sectionHeading}>
                <div>
                  <h2>{tab === '已加入' ? '我的社群' : '为你推荐'}</h2>
                  <p>根据你的兴趣、筛选条件与关注关系排序</p>
                </div>
                <Badge tone="brand">{category === '全部分类' ? '每日更新' : category}</Badge>
              </header>
              <div className={styles.grid}>
                {communities.map((community, index) => (
                  <CommunityCard
                    key={community.id}
                    community={{ ...community, joined: tab === '已加入' || community.joined }}
                    featured={index < 2}
                  />
                ))}
              </div>
            </section>
            <section>
              <header className={styles.sectionHeading}>
                <div>
                  <h2>成长中的社群</h2>
                  <p>过去 7 天成员与讨论增长较快</p>
                </div>
              </header>
              <div className={styles.list}>
                {communities
                  .slice()
                  .reverse()
                  .map((community) => (
                    <CommunityCard key={`growth-${community.id}`} community={community} />
                  ))}
              </div>
            </section>
            {query.hasNextPage ? (
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                加载更多社群
              </Button>
            ) : null}
          </>
        ) : (
          <Card>
            <EmptyPanel
              icon={<UsersRound size={24} />}
              title="没有匹配的社群"
              description="试试其他关键词或分类筛选。"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setKeyword('');
                    setCategory('全部分类');
                    setTab('发现');
                  }}
                >
                  清除筛选
                </Button>
              }
            />
          </Card>
        )}
      </Stack>
    </PageLayout>
  );
}
