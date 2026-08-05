import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  AlertCircle,
  Archive,
  FilePenLine,
  FileText,
  Image,
  Link2,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  libraryApi,
  libraryKeys,
  summarizeBatchDeleteDrafts,
  type ContentCenterDraftPageView,
} from '@/domains/library';
import {
  getPostDraftDisplayTitle,
  postKeys,
  useDraftListSelection,
  type PostDeletedListItemView,
} from '@/domains/posts';
import { mergeInfiniteDataItemsBy, removeInfiniteDataItemsByKey } from '@/shared/api/infiniteData';
import { paths } from '@/shared/config/paths';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { formatDateTime } from '@/shared/lib/format';
import { Badge, Button, Card, Modal, useToast } from '@/shared/ui';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { EmptyPanel, LoadingRows, SideCard } from '../_shared/PageParts';
import productStyles from '../_shared/ProductPages.module.css';
import styles from './ContentCenterPage.module.css';
import { hydrateContentCenterPublishedPage } from './contentCenter.model';

const PAGE_SIZE = 20;
type ContentTab = 'published' | 'drafts' | 'deleted';

function resolveTab(raw: string | null): ContentTab {
  return raw === 'drafts' || raw === 'deleted' ? raw : 'published';
}

function deletedKindLabel(kind: PostDeletedListItemView['postKind']): string {
  return {
    ORIGINAL: '帖子',
    REPLY: '回复',
    QUOTE: '引用',
    REPOST: '转发',
  }[kind];
}

export function ContentCenterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const tab = resolveTab(params.get('tab'));

  const [confirmDraftDelete, setConfirmDraftDelete] = useState(false);

  const published = useInfiniteQuery({
    queryKey: libraryKeys.contentCenterPublished,
    queryFn: async ({ pageParam, signal }) => {
      const page = await libraryApi.published({ cursor: pageParam, limit: PAGE_SIZE }, signal);
      return hydrateContentCenterPublishedPage(page, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
  const drafts = useInfiniteQuery({
    queryKey: libraryKeys.contentCenterDrafts,
    queryFn: ({ pageParam, signal }) =>
      libraryApi.drafts({ cursor: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });
  const deleted = useInfiniteQuery({
    queryKey: libraryKeys.contentCenterDeleted,
    queryFn: ({ pageParam, signal }) =>
      libraryApi.deleted({ cursor: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });

  const publishedItems = useMemo(
    () => mergeInfiniteDataItemsBy(published.data, (post) => post.id),
    [published.data],
  );
  const draftItems = useMemo(
    () => mergeInfiniteDataItemsBy(drafts.data, (draft) => draft.draftId),
    [drafts.data],
  );
  const deletedItems = useMemo(
    () => mergeInfiniteDataItemsBy(deleted.data, (post) => post.postId),
    [deleted.data],
  );
  const {
    draftIds,
    selection: draftSelection,
    allSelected: allLoadedDraftsSelected,
  } = useDraftListSelection(draftItems);

  const degradedPages = published.data?.pages.filter((page) => page.degraded) ?? [];
  const filteredPublishedCount = degradedPages.reduce(
    (total, page) => total + page.filteredCountHint,
    0,
  );

  const deleteDrafts = useMutation({
    mutationFn: (draftIds: string[]) => libraryApi.batchDeleteDrafts(draftIds),
    onSuccess: (result, requestedIds) => {
      const { succeededIds, failedIds } = summarizeBatchDeleteDrafts(result, requestedIds);

      queryClient.setQueryData<InfiniteData<ContentCenterDraftPageView>>(
        libraryKeys.contentCenterDrafts,
        (data) => removeInfiniteDataItemsByKey(data, succeededIds, (item) => item.draftId),
      );
      draftSelection.replace(failedIds);
      setConfirmDraftDelete(false);
      showToast({
        tone: failedIds.length ? 'warning' : 'success',
        title: `已删除 ${succeededIds.size} 个草稿`,
        description: failedIds.length
          ? `${failedIds.length} 个草稿未删除，可能正在发布、状态已变化或服务端未返回对应结果。`
          : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.contentCenterDrafts });
      void queryClient.invalidateQueries({ queryKey: postKeys.drafts });
    },
    onError: () => {
      setConfirmDraftDelete(false);
      showToast({
        tone: 'error',
        title: '草稿删除失败',
        description: '草稿仍保留在列表中，请稍后重试。',
      });
    },
  });

  const activeQuery = tab === 'drafts' ? drafts : tab === 'deleted' ? deleted : published;

  return (
    <PageLayout
      aside={
        <>
          <SideCard title="当前已加载">
            <div className={productStyles.statGrid}>
              <div className={productStyles.statTile}>
                <span>已发布</span>
                <strong>{publishedItems.length}</strong>
                <small>{published.hasNextPage ? '还有更多内容' : '当前列表已加载完'}</small>
              </div>
              <div className={productStyles.statTile}>
                <span>草稿</span>
                <strong>{draftItems.length}</strong>
                <small>
                  {draftItems.filter((item) => item.mediaCountProjection > 0).length} 个含媒体
                </small>
              </div>
              <div className={productStyles.statTile}>
                <span>已删除</span>
                <strong>{deletedItems.length}</strong>
                <small>只读删除记录</small>
              </div>
            </div>
          </SideCard>
          <SideCard title="内容管理说明">
            <ul>
              <li>已发布列表可能因权限复核或卡片聚合短页。</li>
              <li>草稿支持批量删除，失败项会保留并显示结果。</li>
              <li>当前后端仅提供已删除内容查询，不提供恢复或永久清除操作。</li>
            </ul>
          </SideCard>
          <SideCard title="相关入口">
            <div className={styles.relatedLinks}>
              <Link to="/bookmarks">我的收藏夹</Link>
              <Link to="/content/drafts">完整草稿箱</Link>
              <Link to="/history">浏览历史</Link>
            </div>
          </SideCard>
        </>
      }
    >
      <Stack>
        <div className={productStyles.toolbar}>
          <div className={productStyles.pillTabs}>
            <Link
              className={tab === 'published' ? productStyles.active : undefined}
              to="/content?tab=published"
            >
              已发布
            </Link>
            <Link
              className={tab === 'drafts' ? productStyles.active : undefined}
              to="/content?tab=drafts"
            >
              草稿
            </Link>
            <Link
              className={tab === 'deleted' ? productStyles.active : undefined}
              to="/content?tab=deleted"
            >
              已删除
            </Link>
          </div>
          <Button size="sm" onClick={() => navigate('/compose')}>
            <Plus size={15} /> 发布内容
          </Button>
        </div>

        {tab === 'drafts' && draftItems.length ? (
          <Card className={styles.selectionBar}>
            <label>
              <input
                type="checkbox"
                checked={allLoadedDraftsSelected}
                disabled={deleteDrafts.isPending}
                onChange={(event) => draftSelection.setAll(draftIds, event.target.checked)}
              />
              全选已加载草稿
            </label>
            <span>已选择 {draftSelection.selectedCount} 个</span>
            <Button
              size="sm"
              variant="danger"
              disabled={!draftSelection.selectedCount || deleteDrafts.isPending}
              onClick={() => setConfirmDraftDelete(true)}
            >
              <Trash2 size={14} /> 删除所选
            </Button>
          </Card>
        ) : null}

        {activeQuery.isLoading ? <LoadingRows count={3} /> : null}

        {activeQuery.isError ? (
          <Card className={styles.errorPanel}>
            <AlertCircle size={22} />
            <div>
              <strong>内容列表加载失败</strong>
              <p>当前数据没有被修改，可以直接重新请求。</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void activeQuery.refetch()}>
              重新加载
            </Button>
          </Card>
        ) : null}

        {!activeQuery.isLoading && !activeQuery.isError && tab === 'published' ? (
          publishedItems.length ? (
            <>
              {degradedPages.length ? (
                <div className={productStyles.infoBanner}>
                  <AlertCircle size={17} />
                  <p>
                    部分页面因权限或卡片聚合被缩短
                    {filteredPublishedCount ? `，约过滤 ${filteredPublishedCount} 条` : ''}。
                  </p>
                  <button type="button" onClick={() => void published.refetch()}>
                    刷新
                  </button>
                </div>
              ) : null}
              <div className={styles.postList}>
                {publishedItems.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              {published.hasNextPage ? (
                <Button
                  className={styles.loadMore}
                  variant="secondary"
                  loading={published.isFetchingNextPage}
                  onClick={() => void published.fetchNextPage()}
                >
                  加载更多已发布内容
                </Button>
              ) : null}
            </>
          ) : (
            <Card>
              <EmptyPanel
                icon={<FileText size={22} />}
                title="还没有已发布内容"
                description="完成第一篇内容后，它会显示在这里。"
                action={<Button onClick={() => navigate('/compose')}>开始创作</Button>}
              />
            </Card>
          )
        ) : null}

        {!activeQuery.isLoading && !activeQuery.isError && tab === 'drafts' ? (
          draftItems.length ? (
            <>
              <Card className={styles.listCard}>
                {draftItems.map((draft) => (
                  <article key={draft.draftId} className={styles.draftRow}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={draftSelection.isSelected(draft.draftId)}
                        disabled={deleteDrafts.isPending}
                        onChange={() => draftSelection.toggle(draft.draftId)}
                        aria-label={`选择草稿 ${getPostDraftDisplayTitle(draft)}`}
                      />
                      <span aria-hidden="true" />
                    </label>
                    <span className={styles.itemIcon}>
                      <FilePenLine size={18} />
                    </span>
                    <div className={styles.itemCopy}>
                      <strong>{getPostDraftDisplayTitle(draft)}</strong>
                      <small>
                        版本 {draft.draftVersion} · {draft.mediaCountProjection} 个媒体 · 更新于{' '}
                        {formatDateTime(draft.updatedAtIso)}
                      </small>
                      <div className={styles.itemBadges}>
                        {draft.imageCountProjection ? (
                          <Badge tone="neutral">
                            <Image size={12} /> {draft.imageCountProjection}
                          </Badge>
                        ) : null}
                        {draft.videoCountProjection ? (
                          <Badge tone="neutral">
                            <Video size={12} /> {draft.videoCountProjection}
                          </Badge>
                        ) : null}
                        {draft.linkPreviewState.state === 'READY' ? (
                          <Badge tone="brand">
                            <Link2 size={12} /> 链接卡片
                          </Badge>
                        ) : null}
                        {draft.state === 'PUBLISH_FAILED_EDITABLE' ? (
                          <Badge tone="warning">发布失败，可继续编辑</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <Button size="sm" onClick={() => navigate(paths.composeDraft(draft.draftId))}>
                        继续编辑
                      </Button>
                    </div>
                  </article>
                ))}
              </Card>
              {drafts.hasNextPage ? (
                <Button
                  className={styles.loadMore}
                  variant="secondary"
                  loading={drafts.isFetchingNextPage}
                  onClick={() => void drafts.fetchNextPage()}
                >
                  加载更多草稿
                </Button>
              ) : null}
            </>
          ) : (
            <Card>
              <EmptyPanel
                icon={<FilePenLine size={22} />}
                title="草稿箱为空"
                description="未发布的内容会自动保存在这里。"
                action={<Button onClick={() => navigate('/compose')}>新建草稿</Button>}
              />
            </Card>
          )
        ) : null}

        {!activeQuery.isLoading && !activeQuery.isError && tab === 'deleted' ? (
          <Card className={styles.listCard}>
            {deletedItems.length ? (
              deletedItems.map((item) => (
                <article key={item.postId} className={styles.deletedRow}>
                  <span className={styles.deletedIcon}>
                    {item.postKind === 'ORIGINAL' ? <Archive size={18} /> : <Trash2 size={18} />}
                  </span>
                  <div className={styles.itemCopy}>
                    <strong>{item.bodyTextPreview?.trim() || '无文字摘要的已删除内容'}</strong>
                    <small>
                      {deletedKindLabel(item.postKind)} · 删除于 {formatDateTime(item.deletedAtIso)}
                    </small>
                  </div>
                  <Badge tone="neutral">只读记录</Badge>
                </article>
              ))
            ) : (
              <EmptyPanel
                icon={<FileText size={22} />}
                title="没有已删除内容"
                description="删除后的帖子摘要会显示在这里。"
              />
            )}
          </Card>
        ) : null}

        {tab === 'deleted' && deleted.hasNextPage ? (
          <Button
            className={styles.loadMore}
            variant="secondary"
            loading={deleted.isFetchingNextPage}
            onClick={() => void deleted.fetchNextPage()}
          >
            加载更多删除记录
          </Button>
        ) : null}
      </Stack>

      <Modal
        open={confirmDraftDelete}
        title="删除选中的草稿？"
        description={`将请求删除 ${draftSelection.selectedCount} 个草稿。正在发布或状态已变化的草稿会保留。`}
        onClose={() => {
          if (!deleteDrafts.isPending) setConfirmDraftDelete(false);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleteDrafts.isPending}
              onClick={() => setConfirmDraftDelete(false)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleteDrafts.isPending}
              disabled={!draftSelection.selectedCount}
              onClick={() => deleteDrafts.mutate(draftSelection.selectedList)}
            >
              确认删除
            </Button>
          </>
        }
      />
    </PageLayout>
  );
}
