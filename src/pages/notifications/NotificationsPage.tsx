import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  AtSign,
  Bell,
  Check,
  Heart,
  MessageCircle,
  Radio,
  Repeat2,
  ShieldAlert,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  notificationKeys,
  notificationsApi,
  type NotificationItem,
  type NotificationListTab,
  type NotificationType,
  useUnreadSummary,
} from '@/domains/notifications';
import { userKeys, usersApi, type FollowRequestReviewResult } from '@/domains/users';
import { formatRelativeTime } from '@/shared/lib/format';
import type { ReviewDecision } from '@/shared/model/types';
import { Avatar, Badge, Button, Card, useToast } from '@/shared/ui';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { LoadingRows, PageTitle, SideCard } from '../_shared/PageParts';
import styles from './NotificationsPage.module.css';

const tabs = [
  { key: 'all', label: '全部', icon: Bell },
  { key: 'mentions', label: '提及', icon: AtSign },
  { key: 'interactions', label: '互动', icon: Heart },
  { key: 'follows', label: '关注', icon: UserPlus },
  { key: 'communities', label: '社群', icon: Users },
  { key: 'system', label: '系统', icon: ShieldAlert },
] as const;

type UiTab = (typeof tabs)[number]['key'];

const followNotificationTypes = new Set<NotificationType>([
  'FOLLOWED',
  'FOLLOW_REQUEST_RECEIVED',
  'FOLLOW_REQUEST_ACCEPTED',
]);

function toApiTab(tab: UiTab): NotificationListTab {
  if (tab === 'mentions') return 'MENTIONS';
  if (tab === 'interactions') return 'INTERACTIONS';
  if (tab === 'communities') return 'COMMUNITIES';
  if (tab === 'system') return 'SYSTEM';
  return 'ALL';
}

function notificationIcon(type: NotificationType) {
  if (type === 'POST_LIKED') return Heart;
  if (type === 'POST_REPOSTED' || type === 'POST_QUOTED') return Repeat2;
  if (type === 'POST_COMMENTED' || type === 'COMMENT_REPLIED') return MessageCircle;
  if (type === 'MENTIONED_IN_POST') return AtSign;
  if (followNotificationTypes.has(type)) return UserPlus;
  if (type.startsWith('COMMUNITY_')) return Users;
  if (type === 'MEDIA_PROCESSING_FAILED') return AlertTriangle;
  return ShieldAlert;
}

function openActionUrl(actionUrl: string, navigate: ReturnType<typeof useNavigate>) {
  if (actionUrl.startsWith('/')) {
    void navigate(actionUrl);
    return;
  }
  window.location.assign(actionUrl);
}

interface FollowRequestReviewVariables {
  followRequestId: string;
  decision: ReviewDecision;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<UiTab>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const apiTab = toApiTab(tab);
  const listInput = useMemo(
    () => ({ tab: apiTab, unreadOnly, pageSize: 50 }),
    [apiTab, unreadOnly],
  );

  const list = useQuery({
    queryKey: notificationKeys.list(listInput),
    queryFn: ({ signal }) => notificationsApi.list(listInput, signal),
  });
  const unread = useUnreadSummary();
  const followRequests = useQuery({
    queryKey: userKeys.incomingFollowRequests,
    queryFn: ({ signal }) => usersApi.incomingFollowRequests(null, 20, signal),
    enabled: tab === 'all' || tab === 'follows',
  });

  const refreshNotificationState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread }),
    ]);
  };

  const markRead = useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onMutate: (ids) => {
      setReadIds((current) => new Set([...current, ...ids]));
    },
    onSuccess: () => void refreshNotificationState(),
    onError: (_, ids) => {
      setReadIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      showToast({ tone: 'error', title: '标记失败', description: '请稍后重试。' });
    },
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      setReadIds(new Set());
      void refreshNotificationState();
      showToast({ tone: 'success', title: '全部通知已标为已读' });
    },
    onError: () => showToast({ tone: 'error', title: '标记失败', description: '请稍后重试。' }),
  });

  const reviewRequest = useMutation<FollowRequestReviewResult, Error, FollowRequestReviewVariables>(
    {
      mutationFn: ({ followRequestId, decision }) =>
        decision === 'approve'
          ? usersApi.approveFollowRequest(followRequestId)
          : usersApi.rejectFollowRequest(followRequestId),
      onSuccess: (_, variables) => {
        void queryClient.invalidateQueries({ queryKey: userKeys.incomingFollowRequests });
        void refreshNotificationState();
        showToast({
          tone: 'success',
          title: variables.decision === 'approve' ? '已通过关注请求' : '已拒绝关注请求',
        });
      },
      onError: () => showToast({ tone: 'error', title: '审批失败', description: '请稍后重试。' }),
    },
  );

  const visibleNotifications = useMemo(() => {
    const items = list.data?.list ?? [];
    if (tab !== 'follows') return items;
    return items.filter((item) => followNotificationTypes.has(item.type));
  }, [list.data?.list, tab]);

  const followRequestItems = followRequests.data?.list ?? [];
  const tabCount = (key: UiTab) => {
    const summary = unread.data;
    if (!summary) return key === 'follows' ? followRequestItems.length : 0;
    if (key === 'all') return summary.totalUnreadCount;
    if (key === 'mentions') return summary.mentionUnreadCount;
    if (key === 'interactions') return summary.interactionUnreadCount;
    if (key === 'communities') return summary.communityUnreadCount;
    if (key === 'system') return summary.systemUnreadCount;
    return followRequestItems.length;
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.readAt && !readIds.has(item.notificationId)) {
      markRead.mutate([item.notificationId]);
    }

    const actionUrl = item.entity?.actionUrl;
    if (actionUrl) {
      openActionUrl(actionUrl, navigate);
      return;
    }

    try {
      const target = await notificationsApi.resolveTarget(item.notificationId);
      if (target.targetState === 'ALLOW' && target.actionUrl) {
        openActionUrl(target.actionUrl, navigate);
        return;
      }
      showToast({ tone: 'info', title: '相关内容当前不可用' });
    } catch {
      showToast({ tone: 'error', title: '无法打开通知目标', description: '请稍后重试。' });
    }
  };

  const pendingReviewId = reviewRequest.variables?.followRequestId;
  const totalVisible = visibleNotifications.length + followRequestItems.length;

  return (
    <>
      <PageTitle
        title="通知中心"
        description="查看互动、关注、提及、社群和系统动态。"
        actions={
          <Button
            variant="secondary"
            loading={markAll.isPending}
            disabled={!unread.data?.totalUnreadCount}
            onClick={() => markAll.mutate()}
          >
            <Check size={15} /> 全部标为已读
          </Button>
        }
      />
      <PageLayout
        aside={
          <>
            <SideCard title="未读摘要">
              <div className={styles.summary}>
                {tabs.slice(1).map(({ key, label, icon: Icon }) => (
                  <button type="button" key={key} onClick={() => setTab(key)}>
                    <span>
                      <Icon size={15} />
                      {label}
                    </span>
                    <strong>{tabCount(key)}</strong>
                  </button>
                ))}
              </div>
            </SideCard>
            <SideCard title="实时刷新">
              <div className={styles.realtime}>
                <span>
                  <Radio size={16} />
                </span>
                <div>
                  <strong>已启用增量同步</strong>
                  <p>连接可用时自动接收新通知，断线后按序号补齐</p>
                </div>
                <Badge tone="brand">已配置</Badge>
              </div>
            </SideCard>
            <SideCard title="通知说明">
              <ul>
                <li>关注申请直接读取待审批列表</li>
                <li>已读状态与各分类计数同步更新</li>
                <li>通知目标失效时不会跳转到错误页面</li>
              </ul>
            </SideCard>
          </>
        }
      >
        <Stack>
          <nav className={styles.tabs} aria-label="通知分类">
            {tabs.map(({ key, label, icon: Icon }) => {
              const count = tabCount(key);
              return (
                <button
                  type="button"
                  key={key}
                  data-active={tab === key}
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {count ? <b>{count > 99 ? '99+' : count}</b> : null}
                </button>
              );
            })}
          </nav>

          <div className={styles.filter}>
            <label>
              <input
                aria-label="只看未读通知"
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => setUnreadOnly(event.target.checked)}
              />
              只看未读
            </label>
            <span>{totalVisible} 条动态</span>
          </div>

          {(tab === 'follows' || tab === 'all') && followRequests.isLoading ? (
            <LoadingRows count={1} compact />
          ) : null}

          {(tab === 'follows' || tab === 'all') && followRequestItems.length ? (
            <div className={styles.requests} aria-label="待审批关注请求">
              {followRequestItems.map((request) => {
                const name = request.displayName ?? '资料暂不可用';
                const handleLabel = request.handle ? `@${request.handle}` : '用户资料占位';
                const isPending =
                  reviewRequest.isPending && pendingReviewId === request.followRequestId;
                return (
                  <Card className={styles.request} key={request.followRequestId ?? request.userId}>
                    <Avatar fallback={name.slice(0, 1)} alt={name} src={request.avatarUrl} />
                    <div>
                      <strong>{name} 请求关注你</strong>
                      <p>
                        {handleLabel}
                        {request.cardState === 'PLACEHOLDER' ? ' · 公开资料暂不可用' : ''}
                      </p>
                    </div>
                    <div>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={isPending && reviewRequest.variables?.decision === 'reject'}
                        disabled={!request.followRequestId || isPending}
                        onClick={() =>
                          request.followRequestId &&
                          reviewRequest.mutate({
                            followRequestId: request.followRequestId,
                            decision: 'reject',
                          })
                        }
                      >
                        <X size={14} /> 拒绝
                      </Button>
                      <Button
                        size="sm"
                        loading={isPending && reviewRequest.variables?.decision === 'approve'}
                        disabled={!request.followRequestId || isPending}
                        onClick={() =>
                          request.followRequestId &&
                          reviewRequest.mutate({
                            followRequestId: request.followRequestId,
                            decision: 'approve',
                          })
                        }
                      >
                        <Check size={14} /> 通过
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : null}

          {list.data?.degraded ? (
            <Card className={styles.degraded} role="status">
              <AlertTriangle size={17} />
              <span>部分通知资料暂未补齐，列表已保留可安全展示的内容。</span>
            </Card>
          ) : null}

          {list.isLoading ? (
            <LoadingRows count={4} compact />
          ) : list.isError ? (
            <Card className={styles.empty}>
              <AlertTriangle size={26} />
              <h2>通知加载失败</h2>
              <p>网络恢复后可重新加载，不会影响服务端未读状态。</p>
              <Button variant="secondary" onClick={() => void list.refetch()}>
                重新加载
              </Button>
            </Card>
          ) : (
            <div className={styles.list}>
              {visibleNotifications.map((item) => {
                const Icon = notificationIcon(item.type);
                const read = Boolean(item.readAt) || readIds.has(item.notificationId);
                const actorName = item.actor?.displayName ?? '系统通知';
                return (
                  <Card
                    key={item.notificationId}
                    className={styles.item}
                    data-read={read}
                    role="button"
                    tabIndex={0}
                    onClick={() => void openNotification(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void openNotification(item);
                      }
                    }}
                  >
                    <span className={styles.type} data-category={item.category}>
                      <Icon size={17} />
                    </span>
                    <Avatar
                      fallback={actorName.slice(0, 1)}
                      alt={actorName}
                      src={item.actor?.avatarUrl}
                    />
                    <div>
                      <strong>{item.primaryText}</strong>
                      {item.secondaryText ? <p>{item.secondaryText}</p> : null}
                      <small>{formatRelativeTime(item.createdAt)}</small>
                    </div>
                    {!read ? <span className={styles.unread} aria-label="未读" /> : null}
                  </Card>
                );
              })}
              {!visibleNotifications.length && !followRequestItems.length ? (
                <Card className={styles.empty}>
                  <Bell size={26} />
                  <h2>暂无此类通知</h2>
                  <p>新的互动和动态会显示在这里。</p>
                </Card>
              ) : null}
            </div>
          )}
        </Stack>
      </PageLayout>
    </>
  );
}
