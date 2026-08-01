import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import {
  COMMUNITY_MODERATION_ACTION_LABELS,
  communitiesApi,
  communityManageKeys,
  type CommunityModerationActionType,
  type CommunityModerationLogItemView,
} from '@/domains/communities';
import { Badge, Button, Card, Select } from '@/shared/ui';
import { EmptyPanel, LoadingRows } from '@/pages/_shared/PageParts';
import {
  type CommunityManageSectionProps,
  formatCommunityManageDateTime,
  pageCount,
} from '../communityManage.model';
import styles from '../CommunityManagePage.module.css';

const PAGE_SIZE = 15;

function targetSummary(item: CommunityModerationLogItemView): string {
  if (item.targetUser) return item.targetUser.displayName;
  if (item.targetUserId) return `用户 ${item.targetUserId}`;
  if (item.postId) return `帖子 ${item.postId}`;
  if (item.joinRequestId) return `申请 ${item.joinRequestId}`;
  return '社群本身';
}

export function LogsSection({ communityId }: CommunityManageSectionProps) {
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState<CommunityModerationActionType | null>(null);

  const logs = useQuery({
    queryKey: communityManageKeys.logs(communityId, actionType, page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      communitiesApi.listModerationLogs(
        communityId,
        { page, pageSize: PAGE_SIZE, actionType },
        signal,
      ),
  });

  const totalPages = pageCount(logs.data?.total ?? 0, PAGE_SIZE);

  return (
    <Card className={styles.panel}>
      <header>
        <div>
          <h2>操作日志</h2>
          <p>分页读取后端管理审计；不会把客户端提示当作审计事实。</p>
        </div>
        <div className={styles.headerActions}>
          <Badge tone="neutral">{logs.data?.total ?? 0} 条</Badge>
          <Select
            label="动作类型"
            value={actionType ?? 'ALL'}
            onChange={(event) => {
              setActionType(
                event.target.value === 'ALL'
                  ? null
                  : (event.target.value as CommunityModerationActionType),
              );
              setPage(1);
            }}
          >
            <option value="ALL">全部动作</option>
            {Object.entries(COMMUNITY_MODERATION_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {logs.isLoading ? (
        <div className={styles.panelPadding}>
          <LoadingRows count={5} compact />
        </div>
      ) : logs.isError ? (
        <EmptyPanel
          title="操作日志加载失败"
          description="没有使用静态日志替代正式结果。"
          action={<Button onClick={() => void logs.refetch()}>重新加载</Button>}
        />
      ) : logs.data?.list.length ? (
        <div className={styles.logTable}>
          <div className={styles.tableHeader}>
            <span>时间</span>
            <span>操作者</span>
            <span>动作</span>
            <span>目标 / 原因</span>
          </div>
          {logs.data.list.map((item) => (
            <div key={item.logId}>
              <span>{formatCommunityManageDateTime(item.createdAtIso)}</span>
              <strong>{item.actorUser?.displayName ?? '系统或不可见用户'}</strong>
              <p>
                <ClipboardList size={13} /> {COMMUNITY_MODERATION_ACTION_LABELS[item.actionType]}
              </p>
              <small>
                {targetSummary(item)}
                {item.reason ? ` · ${item.reason}` : ''}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel
          icon={<ClipboardList size={28} />}
          title="暂无匹配的操作日志"
          description="完成管理操作后，审计记录会从正式接口出现在这里。"
        />
      )}

      {logs.data && logs.data.total > PAGE_SIZE ? (
        <div className={styles.pagination}>
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            上一页
          </Button>
          <span>
            第 {page} / {totalPages} 页
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
