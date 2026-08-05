import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  AlertCircle,
  Bookmark,
  CheckSquare,
  Folder,
  FolderPlus,
  Globe2,
  Lock,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BOOKMARK_COLLECTION_VISIBILITY_LABELS,
  getPostAvailabilityPlaceholderMessage,
  libraryApi,
  libraryKeys,
  type BookmarkCollectionItemsPage,
  type BookmarkCollectionSummary,
  type BookmarkCollectionVisibility,
  type ListOwnBookmarkCollectionsResult,
} from '@/domains/library';
import { hydratePostCardBrief, type PostViewModel } from '@/domains/posts';
import { mergeInfiniteDataItemsBy, removeInfiniteDataItemsByKey } from '@/shared/api/infiniteData';
import { paths } from '@/shared/config/paths';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { useKeySelection } from '@/shared/hooks/useKeySelection';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { formatDateTime } from '@/shared/lib/format';
import { Button, Card, IconButton, Modal, Select, TextField, useToast } from '@/shared/ui';
import { PostCard } from '@/widgets/post-card/PostCard';
import { EmptyPanel, LoadingRows } from '../_shared/PageParts';
import styles from './BookmarksPage.module.css';

const PAGE_SIZE = 20;

type BookmarkCollectionItem = BookmarkCollectionItemsPage['list'][number];
type ActiveBookmarkCollectionItem = Extract<BookmarkCollectionItem, { itemState: 'ACTIVE' }>;
type HydratedBookmarkCollectionItem =
  | (ActiveBookmarkCollectionItem & { postView: PostViewModel })
  | Extract<BookmarkCollectionItem, { itemState: 'PLACEHOLDER' }>;
type HydratedBookmarkCollectionItemsPage = Omit<BookmarkCollectionItemsPage, 'list'> & {
  list: HydratedBookmarkCollectionItem[];
};

async function hydrateBookmarkCollectionPage(
  page: BookmarkCollectionItemsPage,
  signal?: AbortSignal,
): Promise<HydratedBookmarkCollectionItemsPage> {
  return {
    ...page,
    list: await Promise.all(
      page.list.map(async (item): Promise<HydratedBookmarkCollectionItem> => {
        if (item.itemState === 'PLACEHOLDER') return item;
        return {
          ...item,
          postView: await hydratePostCardBrief(item.postCard, 'bookmark', signal),
        };
      }),
    ),
  };
}

interface CollectionUiState {
  folderOpen: boolean;
  deleteConfirmOpen: boolean;
  renameName: string;
  visibility: BookmarkCollectionVisibility;
  organizing: boolean;
  moveOpen: boolean;
  moveTarget: string;
}

function createCollectionUiState(): CollectionUiState {
  return {
    folderOpen: false,
    deleteConfirmOpen: false,
    renameName: '',
    visibility: 'PRIVATE',
    organizing: false,
    moveOpen: false,
    moveTarget: '',
  };
}

function patchCollectionList(
  current: ListOwnBookmarkCollectionsResult | undefined,
  updated: BookmarkCollectionSummary,
): ListOwnBookmarkCollectionsResult {
  if (!current) return { list: [updated] };
  const exists = current.list.some((item) => item.collectionId === updated.collectionId);
  return {
    list: exists
      ? current.list.map((item) => (item.collectionId === updated.collectionId ? updated : item))
      : [...current.list, updated],
  };
}

function requireCollectionId(collectionId: string | null): string {
  if (!collectionId) throw new Error('bookmark collection is unavailable');
  return collectionId;
}

export function BookmarksPage() {
  const { collectionId: routeCollectionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [collectionSearch, setCollectionSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  const collections = useQuery({
    queryKey: libraryKeys.bookmarkCollections,
    queryFn: ({ signal }) => libraryApi.collections(signal),
  });
  const collectionList = useMemo(() => collections.data?.list ?? [], [collections.data]);
  const defaultCollection = collectionList.find((item) => item.kind === 'DEFAULT') ?? null;
  const routeCollection = routeCollectionId
    ? (collectionList.find((item) => item.collectionId === routeCollectionId) ?? null)
    : null;
  const current = routeCollection ?? defaultCollection;
  const currentCollectionId = current?.collectionId ?? null;
  const [collectionUi, setCollectionUi] = useSynchronizedState(
    currentCollectionId,
    createCollectionUiState(),
  );
  const {
    folderOpen,
    deleteConfirmOpen,
    renameName,
    visibility,
    organizing,
    moveOpen,
    moveTarget,
  } = collectionUi;
  const patchCollectionUi = (patch: Partial<CollectionUiState>) => {
    setCollectionUi((value) => ({ ...value, ...patch }));
  };

  useEffect(() => {
    if (!collections.isSuccess || !currentCollectionId) return;
    if (routeCollectionId !== currentCollectionId) {
      void navigate(paths.bookmarkCollection(currentCollectionId), { replace: true });
    }
  }, [collections.isSuccess, currentCollectionId, navigate, routeCollectionId]);

  const items = useInfiniteQuery({
    queryKey: libraryKeys.bookmarkCollectionItems(currentCollectionId),
    queryFn: async ({ pageParam, signal }) => {
      const collectionId = requireCollectionId(currentCollectionId);
      const page = await libraryApi.collectionItems(
        collectionId,
        { cursor: pageParam, limit: PAGE_SIZE },
        signal,
      );
      return hydrateBookmarkCollectionPage(page, signal);
    },
    enabled: Boolean(currentCollectionId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });

  const itemList = useMemo(
    () => mergeInfiniteDataItemsBy(items.data, (item) => item.bookmarkItemId),
    [items.data],
  );
  const placeholderItems = itemList.filter((item) => item.itemState === 'PLACEHOLDER');
  const itemIds = useMemo(() => itemList.map((item) => item.bookmarkItemId), [itemList]);
  const itemSelection = useKeySelection(itemIds, currentCollectionId);
  const allLoadedSelected = itemSelection.areAllSelected(itemIds);

  const visibleCollections = useMemo(() => {
    const keyword = collectionSearch.trim().toLocaleLowerCase();
    if (!keyword) return collectionList;
    return collectionList.filter((item) => item.name.toLocaleLowerCase().includes(keyword));
  }, [collectionList, collectionSearch]);

  const otherCollections = collectionList.filter(
    (item) => item.collectionId !== currentCollectionId,
  );

  const createCollection = useMutation({
    mutationFn: () => libraryApi.createCollection(createName.trim()),
    onSuccess: (created) => {
      queryClient.setQueryData<ListOwnBookmarkCollectionsResult>(
        libraryKeys.bookmarkCollections,
        (value) => patchCollectionList(value, created),
      );
      setCreateName('');
      setCreateOpen(false);
      showToast({ tone: 'success', title: '收藏夹已创建' });
      void navigate(paths.bookmarkCollection(created.collectionId));
    },
    onError: () =>
      showToast({ tone: 'error', title: '创建失败', description: '请检查名称后重试。' }),
  });

  const saveCollectionSettings = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error('collection unavailable');
      let updated = current;
      if (current.kind === 'CUSTOM' && renameName.trim() !== current.name) {
        updated = await libraryApi.renameCollection(current.collectionId, renameName.trim());
      }
      if (visibility !== updated.visibility) {
        updated = await libraryApi.updateCollectionVisibility(current.collectionId, visibility);
      }
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ListOwnBookmarkCollectionsResult>(
        libraryKeys.bookmarkCollections,
        (value) => patchCollectionList(value, updated),
      );
      patchCollectionUi({ folderOpen: false });
      showToast({ tone: 'success', title: '收藏夹设置已保存' });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: libraryKeys.bookmarkCollections });
      showToast({
        tone: 'error',
        title: '收藏夹设置未完全保存',
        description: '名称或可见范围可能已有一项生效，列表将重新同步服务端状态。',
      });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: () => libraryApi.deleteCollection(requireCollectionId(currentCollectionId)),
    onSuccess: (result) => {
      queryClient.setQueryData<ListOwnBookmarkCollectionsResult>(
        libraryKeys.bookmarkCollections,
        (value) => ({
          list: (value?.list ?? []).filter((item) => item.collectionId !== currentCollectionId),
        }),
      );
      queryClient.removeQueries({
        queryKey: libraryKeys.bookmarkCollectionItems(currentCollectionId),
      });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.bookmarkCollections });
      void queryClient.invalidateQueries({
        queryKey: libraryKeys.bookmarkCollectionItems(result.fallbackCollectionId),
      });
      patchCollectionUi({ folderOpen: false });
      patchCollectionUi({ deleteConfirmOpen: false });
      showToast({
        tone: 'success',
        title: '收藏夹已删除',
        description: result.movedItemCount
          ? `${result.movedItemCount} 条内容已移回默认收藏夹。`
          : undefined,
      });
      void navigate(paths.bookmarkCollection(result.fallbackCollectionId), {
        replace: true,
      });
    },
    onError: () => {
      patchCollectionUi({ deleteConfirmOpen: false });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.bookmarkCollections });
      showToast({
        tone: 'error',
        title: '删除结果未确认',
        description: '收藏夹目录将重新同步服务端状态，请确认后再操作。',
      });
    },
  });

  const moveItems = useMutation({
    mutationFn: () => {
      const collectionId = requireCollectionId(currentCollectionId);
      return libraryApi.moveCollectionItems({
        sourceCollectionId: collectionId,
        targetCollectionId: moveTarget,
        itemIds: itemSelection.selectedList,
      });
    },
    onSuccess: (result) => {
      const moved = new Set(result.movedItemIds);
      queryClient.setQueryData<InfiniteData<HydratedBookmarkCollectionItemsPage>>(
        libraryKeys.bookmarkCollectionItems(currentCollectionId),
        (data) => removeInfiniteDataItemsByKey(data, moved, (item) => item.bookmarkItemId),
      );
      itemSelection.replace(result.skippedItemIds);
      patchCollectionUi({ moveOpen: false });
      if (!result.skippedCount) patchCollectionUi({ organizing: false });
      showToast({
        tone: result.skippedCount ? 'warning' : 'success',
        title: `已移动 ${result.movedCount} 条收藏`,
        description: result.skippedCount
          ? `${result.skippedCount} 条未处理，仍保留选中状态。`
          : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.bookmarkCollections });
      void queryClient.invalidateQueries({
        queryKey: libraryKeys.bookmarkCollectionItems(currentCollectionId),
      });
      void queryClient.invalidateQueries({
        queryKey: libraryKeys.bookmarkCollectionItems(moveTarget),
      });
    },
    onError: () =>
      showToast({ tone: 'error', title: '移动失败', description: '选中内容未被移除。' }),
  });

  const removeItems = useMutation({
    mutationFn: (itemIds: string[]) => libraryApi.removeCollectionItems({ itemIds }),
    onSuccess: (result) => {
      const removed = new Set(result.removedItemIds);
      queryClient.setQueryData<InfiniteData<HydratedBookmarkCollectionItemsPage>>(
        libraryKeys.bookmarkCollectionItems(currentCollectionId),
        (data) => removeInfiniteDataItemsByKey(data, removed, (item) => item.bookmarkItemId),
      );
      itemSelection.replace(result.skippedItemIds);
      showToast({
        tone: result.skippedCount ? 'warning' : 'success',
        title: `已移除 ${result.removedCount} 条收藏记录`,
        description: result.skippedCount
          ? `${result.skippedCount} 条未处理，仍保留选中状态。`
          : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: libraryKeys.bookmarkCollections });
      void queryClient.invalidateQueries({
        queryKey: libraryKeys.bookmarkCollectionItems(currentCollectionId),
      });
    },
    onError: () => showToast({ tone: 'error', title: '移除失败', description: '请稍后重试。' }),
  });

  const beginFolderEdit = () => {
    if (!current) return;
    patchCollectionUi({ renameName: current.name });
    patchCollectionUi({ visibility: current.visibility });
    patchCollectionUi({ folderOpen: true });
  };

  const isPending = moveItems.isPending || removeItems.isPending;

  return (
    <div className={styles.layout}>
      <aside className={styles.directory}>
        <header>
          <div>
            <h1>收藏夹</h1>
            <p>
              <Lock size={12} /> 可分别设置可见范围
            </p>
          </div>
          <IconButton
            size="sm"
            label="新建收藏夹"
            icon={<FolderPlus size={17} />}
            onClick={() => setCreateOpen(true)}
          />
        </header>

        <label className={styles.search}>
          <Search size={15} />
          <input
            aria-label="搜索收藏夹"
            value={collectionSearch}
            onChange={(event) => setCollectionSearch(event.target.value)}
            placeholder="搜索收藏夹"
          />
        </label>

        <nav aria-label="收藏夹目录">
          {collections.isLoading ? (
            <LoadingRows count={3} compact />
          ) : collections.isError ? (
            <div className={styles.directoryError}>
              <AlertCircle size={16} />
              <span>收藏夹加载失败</span>
              <button type="button" onClick={() => void collections.refetch()}>
                重试
              </button>
            </div>
          ) : visibleCollections.length ? (
            visibleCollections.map((collection) => (
              <button
                type="button"
                key={collection.collectionId}
                data-active={collection.collectionId === currentCollectionId}
                onClick={() => navigate(paths.bookmarkCollection(collection.collectionId))}
              >
                <span>
                  <Folder size={17} />
                </span>
                <span>
                  <strong>{collection.name}</strong>
                  <small>
                    {collection.itemCount} 项 ·{' '}
                    {BOOKMARK_COLLECTION_VISIBILITY_LABELS[collection.visibility]}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p className={styles.noCollection}>没有匹配的收藏夹</p>
          )}
        </nav>

        <Button variant="secondary" onClick={() => setCreateOpen(true)}>
          <FolderPlus size={16} /> 新建收藏夹
        </Button>
      </aside>

      <main className={styles.content}>
        <header className={styles.contentHeader}>
          <div>
            <span className={styles.folderIcon}>
              <Bookmark size={20} />
            </span>
            <div>
              <h2>{current?.name ?? '收藏内容'}</h2>
              <p>
                {current?.itemCount ?? itemList.length} 项内容 ·{' '}
                {current ? BOOKMARK_COLLECTION_VISIBILITY_LABELS[current.visibility] : '正在加载'}
              </p>
            </div>
          </div>
          <div>
            <Button
              size="sm"
              variant={organizing ? 'primary' : 'secondary'}
              disabled={!current || !itemList.length}
              onClick={() => {
                patchCollectionUi({ organizing: !organizing });
                itemSelection.clear();
              }}
            >
              <SlidersHorizontal size={15} /> {organizing ? '完成整理' : '批量整理'}
            </Button>
            <IconButton
              size="sm"
              label="收藏夹设置"
              icon={<MoreHorizontal size={17} />}
              disabled={!current}
              onClick={beginFolderEdit}
            />
          </div>
        </header>

        {organizing && itemList.length ? (
          <Card className={styles.organizeBar}>
            <label>
              <input
                type="checkbox"
                checked={allLoadedSelected}
                disabled={isPending}
                onChange={(event) => itemSelection.setAll(itemIds, event.target.checked)}
              />
              <CheckSquare size={15} /> 全选已加载内容
            </label>
            <span>已选择 {itemSelection.selectedCount} 项</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!itemSelection.selectedCount || isPending}
              loading={removeItems.isPending}
              onClick={() => removeItems.mutate(itemSelection.selectedList)}
            >
              <Trash2 size={14} /> 移除所选
            </Button>
            <Button
              size="sm"
              disabled={!itemSelection.selectedCount || !otherCollections.length || isPending}
              onClick={() => {
                patchCollectionUi({ moveTarget: otherCollections[0]?.collectionId ?? '' });
                patchCollectionUi({ moveOpen: true });
              }}
            >
              移动到其他收藏夹
            </Button>
          </Card>
        ) : null}

        {items.isLoading || collections.isLoading ? (
          <LoadingRows />
        ) : items.isError || collections.isError ? (
          <Card className={styles.errorCard}>
            <AlertCircle size={22} />
            <div>
              <strong>{collections.isError ? '收藏夹目录加载失败' : '收藏内容加载失败'}</strong>
              <p>当前列表没有被修改，可以安全重新同步。</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void collections.refetch();
                if (currentCollectionId) void items.refetch();
              }}
            >
              重新加载
            </Button>
          </Card>
        ) : itemList.length ? (
          <>
            <div className={styles.feed}>
              {itemList.map((item) => (
                <div
                  key={item.bookmarkItemId}
                  className={styles.selectable}
                  data-selected={itemSelection.isSelected(item.bookmarkItemId)}
                >
                  {organizing ? (
                    <label className={styles.selectionControl}>
                      <input
                        type="checkbox"
                        checked={itemSelection.isSelected(item.bookmarkItemId)}
                        disabled={isPending}
                        onChange={() => itemSelection.toggle(item.bookmarkItemId)}
                      />
                      <span>
                        {itemSelection.isSelected(item.bookmarkItemId) ? '已选择' : '选择'}
                      </span>
                    </label>
                  ) : null}
                  {item.itemState === 'ACTIVE' ? (
                    <PostCard post={item.postView} />
                  ) : (
                    <Card className={styles.placeholderCard}>
                      <span>
                        <AlertCircle size={20} />
                      </span>
                      <div>
                        <strong>收藏内容暂不可用</strong>
                        <p>
                          {getPostAvailabilityPlaceholderMessage(
                            item.placeholderReasonCode,
                            'bookmark',
                          )}
                        </p>
                        <small>收藏于 {formatDateTime(item.savedAtIso)}</small>
                      </div>
                      {!organizing ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={removeItems.isPending}
                          onClick={() => removeItems.mutate([item.bookmarkItemId])}
                        >
                          移除记录
                        </Button>
                      ) : null}
                    </Card>
                  )}
                </div>
              ))}
            </div>
            {items.hasNextPage ? (
              <Button
                className={styles.loadMore}
                variant="secondary"
                loading={items.isFetchingNextPage}
                onClick={() => void items.fetchNextPage()}
              >
                加载更多收藏
              </Button>
            ) : null}
          </>
        ) : (
          <Card>
            <EmptyPanel
              icon={<Bookmark size={24} />}
              title="这个收藏夹还没有内容"
              description="在帖子操作栏点击收藏，即可将内容保存到这里。"
              action={<Button onClick={() => navigate('/explore')}>去发现内容</Button>}
            />
          </Card>
        )}

        {placeholderItems.length > 1 && !organizing ? (
          <Card className={styles.unavailable}>
            <span>
              <AlertCircle size={18} />
            </span>
            <div>
              <strong>{placeholderItems.length} 条收藏内容当前不可用</strong>
              <p>可以保留这些时间线位置，也可以一次移除已加载的失效记录。</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              loading={removeItems.isPending}
              onClick={() =>
                removeItems.mutate(placeholderItems.map((item) => item.bookmarkItemId))
              }
            >
              移除已加载记录
            </Button>
          </Card>
        ) : null}
      </main>

      <Modal
        open={createOpen}
        title="新建收藏夹"
        description="新收藏夹默认仅自己可见，创建后可以调整可见范围。"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              loading={createCollection.isPending}
              disabled={!createName.trim()}
              onClick={() => createCollection.mutate()}
            >
              创建
            </Button>
          </>
        }
      >
        <TextField
          label="收藏夹名称"
          name="name"
          value={createName}
          onChange={(event) => setCreateName(event.target.value)}
          placeholder="例如：产品灵感"
          maxLength={32}
        />
      </Modal>

      <Modal
        open={folderOpen}
        title="收藏夹设置"
        description={
          current?.kind === 'DEFAULT'
            ? '默认收藏夹名称不可修改，但始终可以作为收藏目标。'
            : '修改名称、可见范围或删除当前收藏夹。'
        }
        onClose={() => patchCollectionUi({ folderOpen: false })}
        footer={
          <>
            <Button
              variant="danger"
              disabled={current?.kind !== 'CUSTOM' || saveCollectionSettings.isPending}
              onClick={() => {
                patchCollectionUi({ folderOpen: false });
                patchCollectionUi({ deleteConfirmOpen: true });
              }}
            >
              <Trash2 size={15} /> 删除收藏夹
            </Button>
            <Button variant="secondary" onClick={() => patchCollectionUi({ folderOpen: false })}>
              取消
            </Button>
            <Button
              disabled={
                !current ||
                (current.kind === 'CUSTOM' && !renameName.trim()) ||
                deleteCollection.isPending
              }
              loading={saveCollectionSettings.isPending}
              onClick={() => saveCollectionSettings.mutate()}
            >
              保存设置
            </Button>
          </>
        }
      >
        <div className={styles.settingsFields}>
          <TextField
            label="收藏夹名称"
            name="rename"
            value={renameName}
            disabled={current?.kind === 'DEFAULT'}
            onChange={(event) => patchCollectionUi({ renameName: event.target.value })}
            maxLength={32}
          />
          <Select
            label="可见范围"
            value={visibility}
            disabled={current?.kind === 'DEFAULT'}
            onChange={(event) =>
              patchCollectionUi({ visibility: event.target.value as BookmarkCollectionVisibility })
            }
          >
            <option value="PRIVATE">仅自己可见</option>
            <option value="FOLLOWERS">关注者可见</option>
            <option value="PUBLIC">公开</option>
          </Select>
          <div className={styles.visibilityHint}>
            {visibility === 'PRIVATE' ? <Lock size={15} /> : null}
            {visibility === 'FOLLOWERS' ? <Users size={15} /> : null}
            {visibility === 'PUBLIC' ? <Globe2 size={15} /> : null}
            <span>{BOOKMARK_COLLECTION_VISIBILITY_LABELS[visibility]}</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        title="确认删除收藏夹？"
        description={
          current
            ? `“${current.name}”中的收藏内容会移回默认收藏夹，收藏记录不会被永久删除。`
            : '收藏内容会移回默认收藏夹，收藏记录不会被永久删除。'
        }
        onClose={() => {
          if (!deleteCollection.isPending) patchCollectionUi({ deleteConfirmOpen: false });
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleteCollection.isPending}
              onClick={() => patchCollectionUi({ deleteConfirmOpen: false })}
            >
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleteCollection.isPending}
              disabled={current?.kind !== 'CUSTOM'}
              onClick={() => deleteCollection.mutate()}
            >
              <Trash2 size={15} /> 确认删除
            </Button>
          </>
        }
      />

      <Modal
        open={moveOpen}
        title="移动收藏内容"
        description={`将 ${itemSelection.selectedCount} 条内容移动到另一个收藏夹。`}
        onClose={() => patchCollectionUi({ moveOpen: false })}
        footer={
          <>
            <Button variant="secondary" onClick={() => patchCollectionUi({ moveOpen: false })}>
              取消
            </Button>
            <Button
              disabled={!moveTarget}
              loading={moveItems.isPending}
              onClick={() => moveItems.mutate()}
            >
              确认移动
            </Button>
          </>
        }
      >
        <Select
          label="目标收藏夹"
          value={moveTarget}
          onChange={(event) => patchCollectionUi({ moveTarget: event.target.value })}
        >
          {otherCollections.map((collection) => (
            <option key={collection.collectionId} value={collection.collectionId}>
              {collection.name} · {BOOKMARK_COLLECTION_VISIBILITY_LABELS[collection.visibility]}
            </option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
