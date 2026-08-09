import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { AlertCircle, Clock3, Eye, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getBrowseHistorySourceLabel,
  getPostAvailabilityPlaceholderMessage,
  libraryApi,
  libraryKeys,
  type PostBrowseHistoryItemView,
  type PostBrowseHistoryPageView,
} from '@/domains/library';
import { mergeInfiniteDataItemsBy, removeInfiniteDataItemsByKey } from '@/shared/api/infiniteData';
import { paths } from '@/shared/config/paths';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { useKeySelection } from '@/shared/hooks/useKeySelection';
import { formatDateTime } from '@/shared/lib/format';
import { settleBatch } from '@/shared/lib/settleBatch';
import { Badge, Button, Modal, useToast } from '@/shared/ui';
import { PageLayout } from '@/widgets/layout/PageLayout';
import { EmptyPanel, LoadingRows, PageTitle, SideCard } from '../_shared/PageParts';
import { formatHistoryDeleteFailure } from './historyDeleteFeedback';
import styles from './BrowsingHistoryPage.module.css';

const PAGE_SIZE = 20;
type HistoryFilter = 'all' | 'posts' | 'communities';
type ConfirmAction =
  { type: 'clear' } | { type: 'selected' } | { type: 'single'; postId: string } | null;

function getHistoryTitle(item: PostBrowseHistoryItemView): string {
  if (item.itemState === 'PLACEHOLDER') return '内容暂不可用';
  const normalized = item.postCard.bodyTextPreview?.replace(/\s+/g, ' ').trim() ?? '';
  return normalized.length > 42 ? `${normalized.slice(0, 42)}…` : normalized || '无文字内容';
}

function isCommunityItem(item: PostBrowseHistoryItemView): boolean {
  return (
    item.sourceScene === 'COMMUNITY_POST' ||
    item.sourceModule === 'COMMUNITY' ||
    Boolean(item.postCard?.community)
  );
}

export function BrowsingHistoryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const query = useInfiniteQuery({
    queryKey: libraryKeys.history,
    queryFn: ({ pageParam, signal }) =>
      libraryApi.history({ cursor: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const allItems = useMemo(
    () => mergeInfiniteDataItemsBy(query.data, (item) => item.postId),
    [query.data],
  );
  const items = useMemo(() => {
    if (filter === 'communities') return allItems.filter(isCommunityItem);
    if (filter === 'posts') return allItems.filter((item) => !isCommunityItem(item));
    return allItems;
  }, [allItems, filter]);
  const allItemIds = useMemo(() => allItems.map((item) => item.postId), [allItems]);
  const visibleIds = useMemo(() => items.map((item) => item.postId), [items]);
  const historySelection = useKeySelection(allItemIds);
  const allVisibleSelected = historySelection.areAllSelected(visibleIds);

  const removeMutation = useMutation({
    mutationFn: (postIds: string[]) =>
      settleBatch(postIds, (postId) => libraryApi.deleteHistoryItem(postId), 4),
    onSuccess: (results) => {
      const fulfilledIds = new Set(
        results.filter((item) => item.status === 'fulfilled').map((item) => item.input),
      );
      const failedResults = results.filter((item) => item.status === 'rejected');
      const failedIds = failedResults.map((item) => item.input);

      queryClient.setQueryData<InfiniteData<PostBrowseHistoryPageView>>(
        libraryKeys.history,
        (data) => removeInfiniteDataItemsByKey(data, fulfilledIds, (item) => item.postId),
      );
      historySelection.replace(failedIds);
      showToast({
        tone: failedIds.length ? 'warning' : 'success',
        title: `已删除 ${fulfilledIds.size} 条浏览记录`,
        description: failedIds.length
          ? formatHistoryDeleteFailure(failedIds.length, failedResults[0]?.reason)
          : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.history });
    },
  });

  const clearMutation = useMutation({
    mutationFn: libraryApi.clearHistory,
    onSuccess: (result) => {
      queryClient.setQueryData<InfiniteData<PostBrowseHistoryPageView>>(
        libraryKeys.history,
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  list: [],
                  nextCursor: null,
                })),
              }
            : data,
      );
      historySelection.clear();
      showToast({
        tone: 'success',
        title: '浏览历史已清空',
        description: `服务端共清理 ${result.clearedCount} 条记录。`,
      });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.history });
    },
    onError: () =>
      showToast({ tone: 'error', title: '清空失败', description: '历史记录仍然保留。' }),
  });

  const handleConfirm = () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;
    if (action.type === 'clear') {
      clearMutation.mutate();
      return;
    }
    if (action.type === 'single') {
      removeMutation.mutate([action.postId]);
      return;
    }
    removeMutation.mutate(historySelection.selectedList);
  };

  const selectedCount = historySelection.selectedCount;
  const isMutating = removeMutation.isPending || clearMutation.isPending;

  return (
    <>
      <PageTitle title="浏览历史" description="管理最近查看过的帖子和社群，仅当前账号可见。" />
      <PageLayout
        aside={
          <SideCard title="隐私与清理">
            <p>浏览历史不会公开展示。批量删除会逐条调用正式单项删除接口，失败记录会保留。</p>
            <Button
              className={styles.clearButton}
              variant="secondary"
              disabled={!allItems.length || isMutating}
              onClick={() => setConfirmAction({ type: 'clear' })}
            >
              <Trash2 size={16} />
              清空历史
            </Button>
          </SideCard>
        }
      >
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div className={styles.filters} aria-label="浏览历史筛选">
              {(
                [
                  ['all', '全部'],
                  ['posts', '帖子'],
                  ['communities', '社群'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-active={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.batchActions}>
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={!visibleIds.length || isMutating}
                  onChange={() => historySelection.toggleAll(visibleIds)}
                />
                <span>{allVisibleSelected ? '取消全选当前筛选' : '全选当前筛选'}</span>
              </label>
              <span>{selectedCount ? `已选择 ${selectedCount} 项` : '选择记录后可批量删除'}</span>
              <Button
                size="sm"
                variant="danger"
                disabled={!selectedCount || isMutating}
                onClick={() => setConfirmAction({ type: 'selected' })}
              >
                删除所选
              </Button>
            </div>
          </div>

          {query.isLoading ? (
            <div className={styles.loading}>
              <LoadingRows count={4} />
            </div>
          ) : query.isError ? (
            <div className={styles.errorPanel}>
              <AlertCircle size={22} />
              <div>
                <strong>浏览历史加载失败</strong>
                <p>当前记录没有被修改，可以安全重试。</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
                重新加载
              </Button>
            </div>
          ) : items.length ? (
            <>
              <div className={styles.list}>
                {items.map((item) => {
                  const active = item.itemState === 'ACTIVE';
                  const title = getHistoryTitle(item);
                  return (
                    <article
                      className={styles.historyItem}
                      data-placeholder={!active}
                      key={item.postId}
                    >
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={historySelection.isSelected(item.postId)}
                          disabled={isMutating}
                          onChange={() => historySelection.toggle(item.postId)}
                          aria-label={`选择 ${title}`}
                        />
                        <span aria-hidden="true" />
                      </label>
                      <div className={styles.itemCopy}>
                        {active ? (
                          <Link to={paths.post(item.postId)} className={styles.itemTitle}>
                            {title}
                          </Link>
                        ) : (
                          <strong className={styles.itemTitle}>{title}</strong>
                        )}
                        <div className={styles.meta}>
                          {active && item.postCard.author ? (
                            <span>作者 @{item.postCard.author.handle}</span>
                          ) : (
                            <Badge tone="warning">作者 不可用</Badge>
                          )}
                          <i aria-hidden="true" />
                          <span>
                            <Clock3 size={13} />
                            {formatDateTime(item.lastViewedAtIso)}
                          </span>
                          <i aria-hidden="true" />
                          <span>来源：{getBrowseHistorySourceLabel(item)}</span>
                          <i aria-hidden="true" />
                          <span>查看 {item.viewCount} 次</span>
                        </div>
                        <p>
                          {active
                            ? item.postCard.bodyTextPreview?.trim() || '该内容没有文字摘要。'
                            : getPostAvailabilityPlaceholderMessage(
                                item.placeholderReasonCode,
                                'history',
                              )}
                        </p>
                      </div>
                      <div className={styles.itemActions}>
                        {active ? (
                          <Link className={styles.viewLink} to={paths.post(item.postId)}>
                            <Eye size={15} />
                            查看
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className={styles.deleteButton}
                          disabled={isMutating}
                          onClick={() => setConfirmAction({ type: 'single', postId: item.postId })}
                        >
                          <Trash2 size={15} />
                          删除
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {query.hasNextPage ? (
                <div className={styles.pagination}>
                  <Button
                    variant="secondary"
                    loading={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                  >
                    加载更多浏览记录
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyPanel
              icon={<Search size={24} />}
              title={allItems.length ? '当前筛选下没有记录' : '暂无浏览记录'}
              description={
                allItems.length
                  ? '切换筛选条件可查看其他浏览记录。'
                  : '你查看过的帖子和社群会出现在这里。'
              }
              action={
                allItems.length ? undefined : (
                  <Button onClick={() => navigate('/explore')}>去发现内容</Button>
                )
              }
            />
          )}
        </section>
      </PageLayout>

      <Modal
        open={Boolean(confirmAction)}
        title={confirmAction?.type === 'clear' ? '清空全部浏览历史？' : '删除浏览记录？'}
        description="此操作只会删除历史记录，不会影响原始帖子或社群。"
        onClose={() => setConfirmAction(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              取消
            </Button>
            <Button variant="danger" loading={isMutating} onClick={handleConfirm}>
              确认删除
            </Button>
          </>
        }
      />
    </>
  );
}
