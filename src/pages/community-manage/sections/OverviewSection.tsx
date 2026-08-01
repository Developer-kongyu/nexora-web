import { useQuery } from '@tanstack/react-query';
import { Activity, ClipboardList, Pin, UserCheck, ShieldCheck, UsersRound } from 'lucide-react';
import { useState } from 'react';
import {
  COMMUNITY_MODERATION_ACTION_LABELS,
  COMMUNITY_OVERVIEW_WINDOW_OPTIONS,
  communitiesApi,
  communityManageKeys,
  type CommunityOverviewWindowDays,
} from '@/domains/communities';
import { Button, Card, Select, SelectOptions } from '@/shared/ui';
import { EmptyPanel, LoadingRows } from '@/pages/_shared/PageParts';
import {
  formatCommunityManageDateTime,
  type CommunityManageSection,
  type CommunityManageSectionProps,
} from '../communityManage.model';
import styles from '../CommunityManagePage.module.css';

interface OverviewSectionProps extends CommunityManageSectionProps {
  onNavigate: (section: CommunityManageSection) => void;
}

export function OverviewSection({ communityId, onNavigate }: OverviewSectionProps) {
  const [days, setDays] = useState<CommunityOverviewWindowDays>(7);
  const overview = useQuery({
    queryKey: communityManageKeys.overview(communityId, days),
    queryFn: ({ signal }) => communitiesApi.managementOverview(communityId, days, signal),
  });
  const logs = useQuery({
    queryKey: communityManageKeys.logs(communityId, null, 1, 5),
    queryFn: ({ signal }) =>
      communitiesApi.listModerationLogs(
        communityId,
        { page: 1, pageSize: 5, actionType: null },
        signal,
      ),
  });

  if (overview.isLoading) return <LoadingRows count={4} />;
  if (overview.isError || !overview.data) {
    return (
      <Card>
        <EmptyPanel
          title="管理概览暂时不可用"
          description="未使用推测数据填充指标。请检查网络后重新加载。"
          action={<Button onClick={() => void overview.refetch()}>重新加载</Button>}
        />
      </Card>
    );
  }

  const snapshot = overview.data.snapshot;
  const metrics = [
    { label: '总成员', value: snapshot.memberCount, icon: UsersRound },
    { label: '待审批申请', value: snapshot.pendingJoinRequestCount, icon: UserCheck },
    { label: '累计帖子', value: snapshot.postCount, icon: Activity },
    { label: '当前置顶', value: snapshot.pinnedPostCount, icon: Pin },
    { label: '活跃管理员', value: snapshot.activeManagerCount, icon: ShieldCheck },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.sectionToolbar}>
        <div>
          <h2>运营概览</h2>
          <p>数据直接来自当前社群管理快照，不使用前端估算值。</p>
        </div>
        <Select
          label="统计窗口"
          value={String(days)}
          onChange={(event) => setDays(Number(event.target.value) as CommunityOverviewWindowDays)}
        >
          <SelectOptions options={COMMUNITY_OVERVIEW_WINDOW_OPTIONS} />
        </Select>
      </div>

      <div className={styles.metrics}>
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className={styles.metric}>
            <span>
              <Icon size={18} />
            </span>
            <div>
              <small>{label}</small>
              <strong>{value.toLocaleString()}</strong>
            </div>
          </Card>
        ))}
      </div>

      <Card className={styles.panel}>
        <header>
          <div>
            <h2>待办事项</h2>
            <p>仅展示当前后端能够准确计算的管理任务。</p>
          </div>
        </header>
        <div className={styles.tasks}>
          <article>
            <span className={styles.taskIcon}>
              <UserCheck size={18} />
            </span>
            <div>
              <strong>{snapshot.pendingJoinRequestCount} 个待审批加入申请</strong>
              <p>审批结果会同步更新成员数、概览与审计日志。</p>
            </div>
            <Button size="sm" onClick={() => onNavigate('requests')}>
              处理申请
            </Button>
          </article>
          <article>
            <span className={styles.taskIcon}>
              <Pin size={18} />
            </span>
            <div>
              <strong>{snapshot.pinnedPostCount} / 3 个置顶槽位已使用</strong>
              <p>公告必须引用一条已发布帖子，不能保存为独立自由文本。</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onNavigate('pinned')}>
              管理置顶
            </Button>
          </article>
          <article>
            <span className={styles.taskIcon}>
              <ClipboardList size={18} />
            </span>
            <div>
              <strong>最近发帖：{formatCommunityManageDateTime(snapshot.lastPostAtIso)}</strong>
              <p>查看成员、规则、设置和置顶内容的管理审计记录。</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onNavigate('logs')}>
              查看日志
            </Button>
          </article>
        </div>
      </Card>

      <Card className={styles.panel}>
        <header>
          <div>
            <h2>每日增量</h2>
            <p>后端只返回实际存在统计文档的日期，不补造缺失日期。</p>
          </div>
        </header>
        {overview.data.daily.length > 0 ? (
          <div className={styles.dailyTable}>
            <div className={styles.tableHeader}>
              <span>日期</span>
              <span>新成员</span>
              <span>新申请</span>
              <span>新帖子</span>
            </div>
            {overview.data.daily.map((item) => (
              <div key={item.date}>
                <strong>{item.date}</strong>
                <span>{item.newMemberCount}</span>
                <span>{item.newJoinRequestCount}</span>
                <span>{item.newPostCount}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel title="当前窗口暂无统计记录" description="缺失日期不会被前端补成 0。" />
        )}
      </Card>

      <Card className={styles.panel}>
        <header>
          <div>
            <h2>近期管理活动</h2>
            <p>来自正式审计日志，不显示虚构成员或操作。</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onNavigate('logs')}>
            查看全部
          </Button>
        </header>
        {logs.isLoading ? (
          <div className={styles.panelPadding}>
            <LoadingRows count={3} compact />
          </div>
        ) : logs.data?.list.length ? (
          <div className={styles.activity}>
            {logs.data.list.map((item) => (
              <div key={item.logId}>
                <span>
                  <ClipboardList size={14} />
                </span>
                <p>
                  <strong>{item.actorUser?.displayName ?? '系统或不可见用户'}</strong>{' '}
                  {COMMUNITY_MODERATION_ACTION_LABELS[item.actionType]}
                </p>
                <small>{formatCommunityManageDateTime(item.createdAtIso)}</small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="暂无管理日志"
            description="完成管理操作后，正式审计记录会显示在这里。"
          />
        )}
      </Card>
    </div>
  );
}
