import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Ban, EyeOff, Search, ShieldCheck, VolumeX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { userKeys, usersApi } from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { mergeInfiniteDataItemsBy } from '@/shared/api/infiniteData';
import { getNextCursorPageParam } from '@/shared/api/pagination';
import { Avatar, Button, Card, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import {
  canCancelSafetyEntry,
  filterSafetyItems,
  muteScopeLabel,
  placeholderReasonLabel,
  safetyDisplayName,
  safetyHandleLabel,
  type SafetyEntryKind,
  type SafetyManagementItem,
} from './safetySettings.model';
import styles from './SettingsPages.module.css';

const PAGE_SIZE = 20;

interface CancelSafetyInput {
  kind: SafetyEntryKind;
  userId: string;
  handle: string;
}

interface SafetyListSectionProps {
  kind: SafetyEntryKind;
  title: string;
  description: string;
  icon: typeof VolumeX;
  items: SafetyManagementItem[];
  loadedCount: number;
  pending: boolean;
  error: boolean;
  hasNextPage: boolean;
  fetchingNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onCancel: (input: CancelSafetyInput) => void;
  cancelingUserId: string | null;
}

function SafetyUserRow({
  kind,
  item,
  canceling,
  onCancel,
}: {
  kind: SafetyEntryKind;
  item: SafetyManagementItem;
  canceling: boolean;
  onCancel: (input: CancelSafetyInput) => void;
}) {
  const displayName = safetyDisplayName(item);
  const isPlaceholder = item.cardState === 'PLACEHOLDER';
  const canCancel = canCancelSafetyEntry(kind, item);
  const description = isPlaceholder
    ? placeholderReasonLabel(item.placeholderReason)
    : kind === 'mute'
      ? muteScopeLabel(item)
      : '双方无法查看内容、关注或发起互动';

  const identity = (
    <>
      <strong>{displayName}</strong>
      <span>{safetyHandleLabel(item)}</span>
    </>
  );

  return (
    <article className={styles.safetyUserRow} data-placeholder={isPlaceholder}>
      {item.handle && !isPlaceholder ? (
        <Link className={styles.safetyAvatarLink} to={paths.profile(item.handle)}>
          <Avatar fallback={displayName.slice(0, 1)} alt={displayName} src={item.avatarUrl} />
        </Link>
      ) : (
        <Avatar fallback="?" alt={displayName} src={item.avatarUrl} />
      )}
      <div className={styles.safetyUserCopy}>
        {item.handle && !isPlaceholder ? (
          <Link to={paths.profile(item.handle)}>{identity}</Link>
        ) : (
          <div>{identity}</div>
        )}
        <p>{description}</p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        disabled={!canCancel}
        loading={canceling}
        title={!canCancel ? '该占位条目当前无法通过 Handle 执行操作' : undefined}
        onClick={() => {
          if (!canCancel || !item.handle) return;
          onCancel({ kind, userId: item.userId, handle: item.handle });
        }}
      >
        {kind === 'mute' ? '取消静音' : '解除屏蔽'}
      </Button>
    </article>
  );
}

function SafetyListSection({
  kind,
  title,
  description,
  icon: Icon,
  items,
  loadedCount,
  pending,
  error,
  hasNextPage,
  fetchingNextPage,
  onRetry,
  onLoadMore,
  onCancel,
  cancelingUserId,
}: SafetyListSectionProps) {
  return (
    <Card className={styles.section}>
      <header>
        <span>
          <Icon size={18} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className={styles.headerBadge}>已加载 {loadedCount}</span>
      </header>

      {pending ? (
        <div className={styles.safetyLoading} aria-label={`正在加载${title}`}>
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {error ? (
        <div className={styles.safetyError} role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>{title}加载失败</strong>
            <p>请检查网络连接或账号状态后重试。</p>
          </div>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            重新加载
          </Button>
        </div>
      ) : null}

      {!pending && !error && items.length ? (
        <div className={styles.safetyUserList}>
          {items.map((item) => (
            <SafetyUserRow
              key={`${kind}-${item.userId}`}
              kind={kind}
              item={item}
              canceling={cancelingUserId === item.userId}
              onCancel={onCancel}
            />
          ))}
        </div>
      ) : null}

      {!pending && !error && !items.length ? (
        <div className={styles.smallEmpty}>
          <EyeOff size={22} />
          <strong>{kind === 'mute' ? '没有匹配的静音账号' : '没有匹配的屏蔽账号'}</strong>
          <p>该列表为空，或当前搜索条件没有匹配结果。</p>
        </div>
      ) : null}

      {hasNextPage ? (
        <div className={styles.safetyPagination}>
          <Button variant="secondary" loading={fetchingNextPage} onClick={onLoadMore}>
            加载更多
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function SafetySettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');

  const mutedQuery = useInfiniteQuery({
    queryKey: userKeys.mutes,
    queryFn: ({ pageParam, signal }) => usersApi.mutedUsers(pageParam, PAGE_SIZE, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });

  const blockedQuery = useInfiniteQuery({
    queryKey: userKeys.blocks,
    queryFn: ({ pageParam, signal }) => usersApi.blockedUsers(pageParam, PAGE_SIZE, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursorPageParam,
  });

  const mutedItems = useMemo(
    () => mergeInfiniteDataItemsBy(mutedQuery.data, (item) => item.userId),
    [mutedQuery.data],
  );
  const blockedItems = useMemo(
    () => mergeInfiniteDataItemsBy(blockedQuery.data, (item) => item.userId),
    [blockedQuery.data],
  );
  const visibleMutedItems = useMemo(
    () => filterSafetyItems(mutedItems, keyword),
    [keyword, mutedItems],
  );
  const visibleBlockedItems = useMemo(
    () => filterSafetyItems(blockedItems, keyword),
    [blockedItems, keyword],
  );

  const cancelMutation = useMutation({
    mutationFn: (input: CancelSafetyInput) =>
      input.kind === 'mute' ? usersApi.unmute(input.handle) : usersApi.unblock(input.handle),
    onSuccess: (result, input) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      showToast({
        tone: result.targetState === 'FOUND' ? 'success' : 'warning',
        title:
          input.kind === 'mute'
            ? result.actionResult === 'NOOP_NOT_FOUND'
              ? '该静音记录已不存在'
              : '已取消静音'
            : result.actionResult === 'NOOP_NOT_FOUND'
              ? '该屏蔽记录已不存在'
              : '已解除屏蔽',
        description:
          result.targetState === 'TARGET_NOT_FOUND'
            ? '操作结果已同步，但目标账号资料当前不可用。'
            : undefined,
      });
    },
    onError: () => {
      showToast({
        tone: 'error',
        title: '安全设置更新失败',
        description: '请刷新列表后重试。',
      });
    },
  });

  const cancelingUserId = cancelMutation.isPending
    ? (cancelMutation.variables?.userId ?? null)
    : null;

  return (
    <SettingsPage
      title="屏蔽与静音"
      description="管理已静音和已屏蔽的账号；所有操作直接同步到账号关系服务。"
    >
      <div className={styles.stack}>
        <Card className={styles.safetySearchCard}>
          <div>
            <ShieldCheck size={18} />
            <span>
              <strong>账号安全关系</strong>
              <small>搜索仅筛选已加载条目，不会向服务端发送昵称或简介。</small>
            </span>
          </div>
          <label className={styles.safetySearch}>
            <Search size={16} />
            <input
              aria-label="搜索已静音或已屏蔽账号"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索昵称、Handle 或状态"
            />
          </label>
        </Card>

        <SafetyListSection
          kind="mute"
          title="已静音账号"
          description="对方不会收到通知，静音范围以服务端记录为准。"
          icon={VolumeX}
          items={visibleMutedItems}
          loadedCount={mutedItems.length}
          pending={mutedQuery.isPending}
          error={mutedQuery.isError}
          hasNextPage={Boolean(mutedQuery.hasNextPage)}
          fetchingNextPage={mutedQuery.isFetchingNextPage}
          onRetry={() => void mutedQuery.refetch()}
          onLoadMore={() => void mutedQuery.fetchNextPage()}
          onCancel={(input) => cancelMutation.mutate(input)}
          cancelingUserId={cancelingUserId}
        />

        <SafetyListSection
          kind="block"
          title="已屏蔽账号"
          description="屏蔽记录保留管理能力，即使部分用户资料当前不可见。"
          icon={Ban}
          items={visibleBlockedItems}
          loadedCount={blockedItems.length}
          pending={blockedQuery.isPending}
          error={blockedQuery.isError}
          hasNextPage={Boolean(blockedQuery.hasNextPage)}
          fetchingNextPage={blockedQuery.isFetchingNextPage}
          onRetry={() => void blockedQuery.refetch()}
          onLoadMore={() => void blockedQuery.fetchNextPage()}
          onCancel={(input) => cancelMutation.mutate(input)}
          cancelingUserId={cancelingUserId}
        />
      </div>
    </SettingsPage>
  );
}
