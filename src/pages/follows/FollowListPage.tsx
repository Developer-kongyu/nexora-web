import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle, Search, SlidersHorizontal, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { userKeys, usersApi } from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { mergeInfiniteDataItemsBy } from '@/shared/api/infiniteData';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { cn } from '@/shared/lib/cn';
import { Button, Card, Modal, Select } from '@/shared/ui';
import { PageLayout } from '@/widgets/layout/PageLayout';
import { RelationUserCard } from '@/widgets/user-card/RelationUserCard';
import { EmptyPanel, LoadingRows, PageTitle, SideCard } from '../_shared/PageParts';
import {
  filterAndSortFollowList,
  type FollowListRelationFilter,
  type FollowListSort,
} from './followList.model';
import styles from './FollowListPage.module.css';

const PAGE_SIZE = 20;

export function FollowListPage() {
  const { handle = 'zhiqiu' } = useParams();
  const location = useLocation();
  const following = location.pathname.endsWith('/following');
  const [keyword, setKeyword] = useState('');
  const [relation, setRelation] = useState<FollowListRelationFilter>('all');
  const [sort, setSort] = useState<FollowListSort>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useInfiniteQuery({
    queryKey: userKeys.connectionList(handle, following ? 'following' : 'followers'),
    queryFn: ({ pageParam, signal }) =>
      following
        ? usersApi.following(handle, pageParam, PAGE_SIZE, signal)
        : usersApi.followers(handle, pageParam, PAGE_SIZE, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });

  const loadedUsers = useMemo(
    () => mergeInfiniteDataItemsBy(query.data, (user) => user.userId),
    [query.data],
  );
  const visibleUsers = useMemo(
    () => filterAndSortFollowList(loadedUsers, { keyword, relation, sort }),
    [keyword, loadedUsers, relation, sort],
  );

  const resetFilters = () => {
    setKeyword('');
    setRelation('all');
    setSort('newest');
  };

  const filterControls = (
    <div className={styles.filterControls}>
      <Select
        label="关系状态"
        value={relation}
        onChange={(event) => setRelation(event.target.value as FollowListRelationFilter)}
      >
        <option value="all">全部关系</option>
        <option value="mutual">互相关注</option>
        <option value="following">我已关注</option>
        <option value="not-following">我未关注</option>
        <option value="pending">关注请求待处理</option>
      </Select>
      <Select
        label="排序方式"
        value={sort}
        onChange={(event) => setSort(event.target.value as FollowListSort)}
      >
        <option value="newest">最近建立关系</option>
        <option value="oldest">最早建立关系</option>
      </Select>
    </div>
  );

  return (
    <>
      <PageTitle
        title={following ? '正在关注' : '关注者'}
        description={`查看 @${handle} 的${following ? '关注列表' : '关注者列表'}`}
      />
      <PageLayout
        aside={
          <>
            <SideCard title="关系筛选">{filterControls}</SideCard>
            <SideCard title="可见性说明">
              <ul>
                <li>列表仅包含当前账号有权查看的用户关系。</li>
                <li>私密账号、停用账号或受限资料可能显示为占位项或不返回。</li>
                <li>关注按钮使用服务端返回的实时关系快照，不推测关系状态。</li>
              </ul>
            </SideCard>
          </>
        }
      >
        <Card className={styles.surface}>
          <header className={styles.relationshipHeader}>
            <div>
              <strong>社交关系</strong>
              <p>在关注者和正在关注之间切换，管理当前账号可操作的关系。</p>
            </div>
            <nav className={styles.relationshipTabs} aria-label="关系列表类型">
              <NavLink
                end
                to={paths.profileFollowers(handle)}
                className={({ isActive }) => cn(isActive && styles.activeTab)}
              >
                关注者
              </NavLink>
              <NavLink
                to={paths.profileFollowing(handle)}
                className={({ isActive }) => cn(isActive && styles.activeTab)}
              >
                正在关注
              </NavLink>
            </nav>
          </header>

          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="搜索关系列表"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索昵称、Handle 或简介"
              />
            </label>
            <Button
              className={styles.mobileFilterButton}
              size="sm"
              variant="secondary"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              筛选
            </Button>
            <span className={styles.countLabel} aria-live="polite">
              当前 {visibleUsers.length} 人 · 已加载 {loadedUsers.length} 人
            </span>
          </div>

          <div className={styles.content}>
            {query.isPending ? <LoadingRows count={4} compact /> : null}

            {query.isError ? (
              <div className={styles.errorPanel} role="alert">
                <AlertCircle size={22} aria-hidden="true" />
                <div>
                  <strong>关系列表加载失败</strong>
                  <p>网络连接或账号权限可能发生变化，请重新加载。</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
                  重新加载
                </Button>
              </div>
            ) : null}

            {!query.isPending && !query.isError && visibleUsers.length ? (
              <div className={styles.list}>
                {visibleUsers.map((user) => (
                  <RelationUserCard key={user.userId} user={user} />
                ))}
              </div>
            ) : null}

            {!query.isPending && !query.isError && !visibleUsers.length ? (
              <EmptyPanel
                icon={<UsersRound size={24} />}
                title={loadedUsers.length ? '没有匹配的用户' : '暂时没有可见关系'}
                description={
                  loadedUsers.length
                    ? '调整搜索关键词或关系筛选后再试。'
                    : `@${handle} 的${following ? '关注列表' : '关注者列表'}目前为空，或你没有查看权限。`
                }
                action={
                  loadedUsers.length ? (
                    <Button variant="secondary" onClick={resetFilters}>
                      清除筛选
                    </Button>
                  ) : undefined
                }
              />
            ) : null}
          </div>

          {query.hasNextPage ? (
            <footer className={styles.pagination}>
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                加载更多
              </Button>
            </footer>
          ) : null}
        </Card>
      </PageLayout>

      <Modal
        open={filtersOpen}
        title="筛选关系列表"
        description="筛选只作用于已经加载的数据，不会改变服务端关系。"
        onClose={() => setFiltersOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={resetFilters}>
              重置
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>完成</Button>
          </>
        }
      >
        {filterControls}
      </Modal>
    </>
  );
}
