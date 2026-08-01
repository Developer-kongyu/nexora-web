import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import {
  COMMUNITY_JOIN_REQUEST_STATUS_LABELS,
  communitiesApi,
  communityManageKeys,
  type ApproveCommunityJoinRequestResponse,
  type CommunityJoinRequestListItemView,
  type CommunityJoinRequestStatus,
  type RejectCommunityJoinRequestResponse,
} from '@/domains/communities';
import type { ReviewDecision } from '@/shared/model/types';
import { Avatar, Badge, Button, Card, IconButton, Select, useToast } from '@/shared/ui';
import { EmptyPanel, LoadingRows } from '@/pages/_shared/PageParts';
import { type CommunityManageSectionProps, formatCommunityManageDateTime, pageCount } from '../communityManage.model';
import styles from '../CommunityManagePage.module.css';

const PAGE_SIZE = 10;

interface ReviewVariables {
  request: CommunityJoinRequestListItemView;
  decision: ReviewDecision;
}

export function JoinRequestsSection({ communityId }: CommunityManageSectionProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [status, setStatus] = useState<CommunityJoinRequestStatus>('PENDING');
  const [page, setPage] = useState(1);

  const requests = useQuery({
    queryKey: communityManageKeys.requests(communityId, status, page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      communitiesApi.listJoinRequests(
        communityId,
        { status, page, pageSize: PAGE_SIZE },
        signal,
      ),
  });

  const review = useMutation<
    ApproveCommunityJoinRequestResponse | RejectCommunityJoinRequestResponse,
    Error,
    ReviewVariables
  >({
    mutationFn: ({ request, decision }: ReviewVariables) =>
      decision === 'approve'
        ? communitiesApi.approveJoinRequest(communityId, request.joinRequestId)
        : communitiesApi.rejectJoinRequest(communityId, request.joinRequestId),
    onSuccess: (result, variables) => {
      const applicant = variables.request.applicantEntry;
      const name = applicant.displayName ?? applicant.handle ?? '该申请人';
      const ineligible = result.result === 'REJECTED_AS_INELIGIBLE';
      const noOp = result.result.includes('ALREADY_');
      showToast({
        tone: ineligible ? 'warning' : 'success',
        title: ineligible
          ? `${name} 当前不具备加入资格，申请已关闭`
          : variables.decision === 'approve'
            ? noOp
              ? `${name} 的申请已处理，无需重复操作`
              : `已批准 ${name} 加入社群`
            : noOp
              ? `${name} 的申请已拒绝，无需重复操作`
              : `已拒绝 ${name} 的申请`,
      });
      void queryClient.invalidateQueries({ queryKey: communityManageKeys.root(communityId) });
    },
    onError: () =>
      showToast({ tone: 'error', title: '审批失败', description: '申请状态可能已变化，请刷新后重试。' }),
  });

  const totalPages = pageCount(requests.data?.total ?? 0, PAGE_SIZE);

  return (
    <Card className={styles.panel}>
      <header>
        <div>
          <h2>加入申请</h2>
          <p>按后端真实状态分页读取；批准与拒绝使用不同的正式动作接口。</p>
        </div>
        <div className={styles.headerActions}>
          <Badge tone={status === 'PENDING' && (requests.data?.total ?? 0) > 0 ? 'warning' : 'neutral'}>
            {requests.data?.total ?? 0} 条
          </Badge>
          <Select
            label="申请状态"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as CommunityJoinRequestStatus);
              setPage(1);
            }}
          >
            {Object.entries(COMMUNITY_JOIN_REQUEST_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {requests.isLoading ? (
        <div className={styles.panelPadding}>
          <LoadingRows count={4} compact />
        </div>
      ) : requests.isError ? (
        <EmptyPanel
          title="加入申请加载失败"
          description="未使用静态申请替代接口结果。"
          action={<Button onClick={() => void requests.refetch()}>重新加载</Button>}
        />
      ) : requests.data?.list.length ? (
        <div className={styles.requests}>
          {requests.data.list.map((request) => {
            const applicant = request.applicantEntry;
            const displayName = applicant.displayName ?? applicant.handle ?? '不可用账号';
            const handle = applicant.handle ? `@${applicant.handle}` : 'Handle 不可用';
            const isCurrentReview = review.variables?.request.joinRequestId === request.joinRequestId;
            return (
              <article key={request.joinRequestId}>
                <Avatar
                  src={applicant.avatarUrl ?? undefined}
                  fallback={displayName.slice(0, 1)}
                  alt={displayName}
                />
                <div>
                  <div className={styles.requestTitle}>
                    <strong>{displayName}</strong>
                    <Badge tone={request.status === 'PENDING' ? 'warning' : 'neutral'}>
                      {COMMUNITY_JOIN_REQUEST_STATUS_LABELS[request.status]}
                    </Badge>
                  </div>
                  <span>
                    {handle} · 申请于 {formatCommunityManageDateTime(request.createdAtIso)}
                  </span>
                  <p>{request.requestMessage || '申请人未填写说明。'}</p>
                  {applicant.cardState === 'PLACEHOLDER' ? (
                    <small>资料占位原因：{applicant.placeholderReason}</small>
                  ) : null}
                  {request.decisionMessage ? <small>审批说明：{request.decisionMessage}</small> : null}
                </div>
                {request.status === 'PENDING' ? (
                  <div className={styles.rowActions}>
                    <IconButton
                      size="sm"
                      label={`拒绝 ${displayName} 的申请`}
                      icon={<X size={16} />}
                      disabled={review.isPending}
                      onClick={() => review.mutate({ request, decision: 'reject' })}
                    />
                    <Button
                      size="sm"
                      loading={review.isPending && isCurrentReview}
                      disabled={review.isPending && !isCurrentReview}
                      onClick={() => review.mutate({ request, decision: 'approve' })}
                    >
                      <Check size={14} /> 批准
                    </Button>
                  </div>
                ) : (
                  <span className={styles.reviewedAt}>
                    {request.reviewedAtIso ? `处理于 ${formatCommunityManageDateTime(request.reviewedAtIso)}` : '未记录处理时间'}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyPanel
          icon={<UserCheck size={28} />}
          title={`没有${COMMUNITY_JOIN_REQUEST_STATUS_LABELS[status]}申请`}
          description="后续申请会从正式接口出现在这里。"
        />
      )}

      {requests.data && requests.data.total > PAGE_SIZE ? (
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
