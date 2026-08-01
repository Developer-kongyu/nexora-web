import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  AlertCircle,
  CheckSquare,
  Clock3,
  FilePenLine,
  Image,
  Link2,
  Send,
  Trash2,
  Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  libraryApi,
  libraryKeys,
  summarizeBatchDeleteDrafts,
  type BatchDeleteOwnDraftsResult,
  type ContentCenterDraftPageView,
} from '@/domains/library';
import { feedKeys } from '@/domains/feed';
import {
  getPostDraftDisplayTitle,
  postKeys,
  postsApi,
  useDraftListSelection,
  type PublishPostFromDraftResult,
} from '@/domains/posts';
import { mergeInfiniteDataItemsBy, removeInfiniteDataItemsByKey } from '@/shared/api/infiniteData';
import { paths } from '@/shared/config/paths';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { requireArrayItem } from '@/shared/lib/array';
import { formatDateTime } from '@/shared/lib/format';
import { settleBatch, type SettledBatchItem } from '@/shared/lib/settleBatch';
import { Badge, Button, Card, Modal, useToast } from '@/shared/ui';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { EmptyPanel, LoadingRows, PageTitle, SideCard } from '../_shared/PageParts';
import productStyles from '../_shared/ProductPages.module.css';
import styles from './DraftsPage.module.css';

const PAGE_SIZE = 20;
const PUBLISH_CONCURRENCY = 2;
const DRAFT_LIST_QUERY_KEYS = [postKeys.drafts, libraryKeys.contentCenterDrafts] as const;
type FulfilledPublishItem = Extract<
  SettledBatchItem<string, PublishPostFromDraftResult>,
  { status: 'fulfilled' }
>;

async function deleteDraftIds(draftIds: string[]): Promise<BatchDeleteOwnDraftsResult> {
  if (draftIds.length === 1) {
    const draftId = requireArrayItem(draftIds, 0, 'draft identifier');
    const result = await postsApi.deleteDraft(draftId);
    return {
      results: [
        {
          draftId: result.draftId,
          succeeded: true,
          outcome: result.outcome,
          errorCode: null,
          errorMessage: null,
        },
      ],
    };
  }
  return libraryApi.batchDeleteDrafts(draftIds);
}

function publishResultSummary(results: SettledBatchItem<string, PublishPostFromDraftResult>[]): {
  succeeded: FulfilledPublishItem[];
  failedIds: string[];
  queuedCount: number;
} {
  const succeeded = results.filter(
    (item): item is FulfilledPublishItem => item.status === 'fulfilled',
  );
  const failedIds = results.filter((item) => item.status === 'rejected').map((item) => item.input);
  return {
    succeeded,
    failedIds,
    queuedCount: succeeded.filter((item) => item.value.publishState === 'PUBLISHING').length,
  };
}

export function DraftsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [publishIds, setPublishIds] = useState<string[]>([]);

  const query = useInfiniteQuery({
    queryKey: postKeys.drafts,
    queryFn: ({ pageParam, signal }) =>
      postsApi.drafts({ cursor: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });

  const drafts = useMemo(
    () => mergeInfiniteDataItemsBy(query.data, (draft) => draft.draftId),
    [query.data],
  );
  const {
    draftIds,
    selection: draftSelection,
    allSelected: allLoadedSelected,
  } = useDraftListSelection(drafts);

  const failedPublishCount = drafts.filter(
    (draft) => draft.state === 'PUBLISH_FAILED_EDITABLE',
  ).length;
  const mediaDraftCount = drafts.filter((draft) => draft.mediaCountProjection > 0).length;

  const removeSucceededDrafts = (draftIds: ReadonlySet<string>) => {
    DRAFT_LIST_QUERY_KEYS.forEach((queryKey) => {
      queryClient.setQueryData<InfiniteData<ContentCenterDraftPageView>>(queryKey, (data) =>
        removeInfiniteDataItemsByKey(data, draftIds, (draft) => draft.draftId),
      );
    });
  };

  const deleteMutation = useMutation({
    mutationFn: deleteDraftIds,
    onSuccess: (result, requestedIds) => {
      const { succeededIds, failedIds } = summarizeBatchDeleteDrafts(result, requestedIds);

      removeSucceededDrafts(new Set(succeededIds));
      draftSelection.replace(failedIds);
      setDeleteIds([]);
      showToast({
        tone: failedIds.length ? 'warning' : 'success',
        title: `已删除 ${succeededIds.size} 份草稿`,
        description: failedIds.length
          ? `${failedIds.length} 份草稿未删除，仍保留在列表并保持选中。`
          : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: postKeys.drafts });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.contentCenterDrafts });
    },
    onError: () => {
      setDeleteIds([]);
      showToast({
        tone: 'error',
        title: '草稿删除失败',
        description: '服务端未确认删除，草稿仍保留在列表中。',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (ids: string[]) =>
      settleBatch(
        ids,
        (draftId) => postsApi.publishDraft(draftId, { allowWaitingMediaPublish: true }),
        PUBLISH_CONCURRENCY,
      ),
    onSuccess: (results) => {
      const { succeeded, failedIds, queuedCount } = publishResultSummary(results);
      const succeededIds = new Set(succeeded.map((item) => item.input));

      removeSucceededDrafts(succeededIds);
      draftSelection.replace(failedIds);
      setPublishIds([]);

      const tone = failedIds.length ? 'warning' : queuedCount ? 'info' : 'success';
      showToast({
        tone,
        title: `已提交 ${succeeded.length} 份草稿`,
        description: failedIds.length
          ? `${failedIds.length} 份发布失败，仍保留在草稿箱并保持选中。`
          : queuedCount
            ? `${queuedCount} 份正在等待媒体处理，完成后会自动发布。`
            : '已发布内容会出现在内容中心和个人主页。',
      });

      void queryClient.invalidateQueries({ queryKey: postKeys.drafts });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.contentCenter });
      void queryClient.invalidateQueries({ queryKey: feedKeys.all });

      if (succeeded.length === 1 && !failedIds.length) {
        const published = requireArrayItem(succeeded, 0, 'published draft result');
        const result = published.value;
        if (result.publishState === 'PUBLISHED') {
          void navigate(paths.post(result.postId));
        }
      }
    },
  });

  const isMutating = deleteMutation.isPending || publishMutation.isPending;

  return (
    <>
      <PageTitle
        title="草稿箱"
        description="管理自动保存与手动保存的草稿，并按正式发布状态处理失败项。"
        actions={
          <Button onClick={() => navigate('/compose')}>
            <FilePenLine size={16} /> 新建草稿
          </Button>
        }
      />
      <PageLayout
        aside={
          <>
            <SideCard title="草稿规则">
              <ul>
                <li>草稿仅当前账号可见，不会进入公开信息流。</li>
                <li>发布失败的草稿会保留失败原因对应的可编辑状态。</li>
                <li>媒体未处理完成时，可进入等待发布队列而不是伪装成即时成功。</li>
              </ul>
              <Button className={styles.sideAction} onClick={() => navigate('/compose')}>
                新建草稿
              </Button>
            </SideCard>
            <SideCard title="当前已加载">
              <div className={styles.summaryGrid}>
                <div>
                  <span>草稿</span>
                  <strong>{drafts.length}</strong>
                </div>
                <div>
                  <span>含媒体</span>
                  <strong>{mediaDraftCount}</strong>
                </div>
                <div>
                  <span>发布失败</span>
                  <strong>{failedPublishCount}</strong>
                </div>
              </div>
            </SideCard>
          </>
        }
      >
        <Stack>
          <div className={productStyles.toolbar}>
            <div className={productStyles.pillTabs}>
              <Link to="/content?tab=published">已发布</Link>
              <Link className={productStyles.active} to="/content/drafts">
                草稿
              </Link>
              <Link to="/content?tab=deleted">已删除</Link>
            </div>
          </div>

          {drafts.length ? (
            <Card className={styles.bulkBar}>
              <label>
                <input
                  type="checkbox"
                  checked={allLoadedSelected}
                  disabled={isMutating}
                  onChange={(event) => draftSelection.setAll(draftIds, event.target.checked)}
                />
                <CheckSquare size={15} /> 全选已加载草稿
              </label>
              <span>已选择 {draftSelection.selectedCount} 项</span>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!draftSelection.selectedCount || isMutating}
                  onClick={() => setPublishIds(draftSelection.selectedList)}
                >
                  <Send size={14} /> 发布所选
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={!draftSelection.selectedCount || isMutating}
                  onClick={() => setDeleteIds(draftSelection.selectedList)}
                >
                  <Trash2 size={14} /> 删除所选
                </Button>
              </div>
            </Card>
          ) : null}

          {query.isLoading ? <LoadingRows count={4} /> : null}

          {query.isError ? (
            <Card className={styles.errorPanel}>
              <AlertCircle size={22} />
              <div>
                <strong>草稿列表加载失败</strong>
                <p>当前草稿没有被修改，可以安全重新请求。</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
                重新加载
              </Button>
            </Card>
          ) : null}

          {!query.isLoading && !query.isError ? (
            drafts.length ? (
              <div className={styles.draftList}>
                {drafts.map((draft) => (
                  <Card
                    key={draft.draftId}
                    className={styles.draftRow}
                    data-selected={draftSelection.isSelected(draft.draftId)}
                  >
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={draftSelection.isSelected(draft.draftId)}
                        disabled={isMutating}
                        onChange={() => draftSelection.toggle(draft.draftId)}
                        aria-label={`选择草稿：${getPostDraftDisplayTitle(draft)}`}
                      />
                      <span aria-hidden="true" />
                    </label>
                    <span className={styles.draftIcon}>
                      <FilePenLine size={20} />
                    </span>
                    <div className={styles.draftCopy}>
                      <strong>{getPostDraftDisplayTitle(draft)}</strong>
                      <div className={styles.metaLine}>
                        <span>
                          <Clock3 size={13} /> 更新于 {formatDateTime(draft.updatedAtIso)}
                        </span>
                        <span>版本 {draft.draftVersion}</span>
                        <span>媒体 {draft.mediaCountProjection} 个</span>
                      </div>
                      <div className={styles.badges}>
                        {draft.imageCountProjection ? (
                          <Badge tone="neutral">
                            <Image size={12} /> 图片 {draft.imageCountProjection}
                          </Badge>
                        ) : null}
                        {draft.videoCountProjection ? (
                          <Badge tone="neutral">
                            <Video size={12} /> 视频 {draft.videoCountProjection}
                          </Badge>
                        ) : null}
                        {draft.linkPreviewState.state === 'READY' ? (
                          <Badge tone="brand">
                            <Link2 size={12} /> 链接卡片
                          </Badge>
                        ) : null}
                        {draft.state === 'PUBLISH_FAILED_EDITABLE' ? (
                          <Badge tone="warning">发布失败，可继续编辑</Badge>
                        ) : (
                          <Badge tone="neutral">可编辑</Badge>
                        )}
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isMutating}
                        onClick={() => navigate(paths.composeDraft(draft.draftId))}
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        disabled={isMutating}
                        onClick={() => setPublishIds([draft.draftId])}
                      >
                        发布
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={isMutating}
                        onClick={() => setDeleteIds([draft.draftId])}
                      >
                        删除
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <EmptyPanel
                  icon={<FilePenLine size={23} />}
                  title="还没有草稿"
                  description="开始创作后，未发布的内容会保存在这里。"
                  action={<Button onClick={() => navigate('/compose')}>开始创作</Button>}
                />
              </Card>
            )
          ) : null}

          {query.hasNextPage ? (
            <Button
              className={styles.loadMore}
              variant="secondary"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              加载更多草稿
            </Button>
          ) : null}
        </Stack>
      </PageLayout>

      <Modal
        open={deleteIds.length > 0}
        title={deleteIds.length > 1 ? `删除 ${deleteIds.length} 份草稿？` : '删除这份草稿？'}
        description="删除后无法从草稿箱恢复；服务端未确认成功的草稿会继续保留。"
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteIds([]);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteIds([])}
            >
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              disabled={!deleteIds.length}
              onClick={() => deleteMutation.mutate(deleteIds)}
            >
              确认删除
            </Button>
          </>
        }
      />

      <Modal
        open={publishIds.length > 0}
        title={publishIds.length > 1 ? `发布 ${publishIds.length} 份草稿？` : '发布这份草稿？'}
        description="媒体未处理完成的草稿会进入等待发布状态；失败项仍保留在草稿箱。"
        onClose={() => {
          if (!publishMutation.isPending) setPublishIds([]);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={publishMutation.isPending}
              onClick={() => setPublishIds([])}
            >
              取消
            </Button>
            <Button
              loading={publishMutation.isPending}
              disabled={!publishIds.length}
              onClick={() => publishMutation.mutate(publishIds)}
            >
              确认发布
            </Button>
          </>
        }
      />
    </>
  );
}
