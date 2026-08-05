import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/domains/auth';
import {
  COMMUNITY_ASSIGNABLE_MEMBER_ROLE_OPTIONS,
  COMMUNITY_MEMBER_ROLE_LABELS,
  COMMUNITY_MEMBER_ROLE_OPTIONS,
  communitiesApi,
  communityManageKeys,
  type CommunityAssignableMemberRole,
  type CommunityMemberListItemView,
  type CommunityMemberRole,
} from '@/domains/communities';
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconButton,
  Modal,
  Select,
  SelectOptions,
  TextField,
  useToast,
} from '@/shared/ui';
import { EmptyPanel, LoadingRows } from '@/pages/_shared/PageParts';
import {
  formatCommunityManageDateTime,
  pageCount,
  type CommunityManageSectionProps,
} from '../communityManage.model';
import styles from '../CommunityManagePage.module.css';

const PAGE_SIZE = 10;

interface ChangeRoleVariables {
  member: CommunityMemberListItemView;
  nextRole: CommunityAssignableMemberRole;
}

interface MembersSectionProps extends CommunityManageSectionProps {
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
}

export function MembersSection({
  communityId,
  canChangeMemberRoles,
  canRemoveMembers,
}: MembersSectionProps) {
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<CommunityMemberRole | null>(null);
  const [keyword, setKeyword] = useState('');
  const [removing, setRemoving] = useState<CommunityMemberListItemView | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  const members = useQuery({
    queryKey: communityManageKeys.members(communityId, role, page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      communitiesApi.listMembers(communityId, { page, pageSize: PAGE_SIZE, role }, signal),
  });

  const changeRole = useMutation({
    mutationFn: ({ member, nextRole }: ChangeRoleVariables) =>
      communitiesApi.changeMemberRole(communityId, member.userId, nextRole),
    onSuccess: (result, variables) => {
      showToast({
        tone: 'success',
        title:
          result.result === 'NO_CHANGE'
            ? `${variables.member.userCard.displayName} 已是${COMMUNITY_MEMBER_ROLE_LABELS[result.nextRole]}`
            : `${variables.member.userCard.displayName} 已调整为${COMMUNITY_MEMBER_ROLE_LABELS[result.nextRole]}`,
      });
      void queryClient.invalidateQueries({ queryKey: communityManageKeys.root(communityId) });
    },
    onError: () =>
      showToast({
        tone: 'error',
        title: '角色调整失败',
        description: '请确认管理权限、目标层级和成员当前状态。',
      }),
  });

  const removeMember = useMutation({
    mutationFn: (member: CommunityMemberListItemView) =>
      communitiesApi.removeMember(communityId, member.userId, removeReason.trim() || null),
    onSuccess: (result, member) => {
      showToast({
        tone: 'success',
        title:
          result.result === 'ALREADY_REMOVED'
            ? `${member.userCard.displayName} 已不在社群中`
            : `${member.userCard.displayName} 已移出社群`,
      });
      setRemoving(null);
      setRemoveReason('');
      void queryClient.invalidateQueries({ queryKey: communityManageKeys.root(communityId) });
    },
    onError: () =>
      showToast({
        tone: 'error',
        title: '移除失败',
        description: '所有者、本人或更高层级成员不能通过当前操作移除。',
      }),
  });

  const filteredMembers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return members.data?.list ?? [];
    return (members.data?.list ?? []).filter((member) => {
      const card = member.userCard;
      return (
        card.displayName.toLowerCase().includes(normalized) ||
        card.handle.toLowerCase().includes(normalized)
      );
    });
  }, [keyword, members.data]);

  const totalPages = pageCount(members.data?.total ?? 0, PAGE_SIZE);

  return (
    <>
      <Card className={styles.panel}>
        <header>
          <div>
            <h2>成员与角色</h2>
            <p>角色筛选由后端分页执行；关键词只筛选当前已加载页。</p>
          </div>
          <Badge tone="brand">{members.data?.total ?? 0} 位成员</Badge>
        </header>
        <div className={styles.managementToolbar}>
          <label className={styles.searchField}>
            <Search size={15} />
            <input
              aria-label="搜索当前页成员"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索当前页成员或 handle"
            />
          </label>
          <Select
            label="角色"
            value={role ?? 'ALL'}
            onChange={(event) => {
              setRole(
                event.target.value === 'ALL' ? null : (event.target.value as CommunityMemberRole),
              );
              setPage(1);
            }}
          >
            <option value="ALL">全部角色</option>
            <SelectOptions options={COMMUNITY_MEMBER_ROLE_OPTIONS} />
          </Select>
        </div>

        {members.isLoading ? (
          <div className={styles.panelPadding}>
            <LoadingRows count={4} compact />
          </div>
        ) : members.isError ? (
          <EmptyPanel
            title="成员列表加载失败"
            description="没有使用静态成员替代正式结果。"
            action={<Button onClick={() => void members.refetch()}>重新加载</Button>}
          />
        ) : filteredMembers.length ? (
          <div className={styles.managementList}>
            {filteredMembers.map((member) => {
              const card = member.userCard;
              const immutable = member.role === 'OWNER' || member.userId === currentUserId;
              const isChanging =
                changeRole.isPending && changeRole.variables?.member.userId === member.userId;
              return (
                <article key={member.userId}>
                  <Avatar
                    src={card.avatarUrl ?? undefined}
                    fallback={card.displayName.slice(0, 1)}
                    alt={card.displayName}
                  />
                  <div>
                    <strong>{card.displayName}</strong>
                    <span>
                      @{card.handle} · 加入于 {formatCommunityManageDateTime(member.joinedAtIso)}
                    </span>
                    <small>
                      {card.followersCount.toLocaleString()} 位关注者 ·{' '}
                      {card.source === 'PG_FALLBACK' ? '实时资料回退' : '资料投影'}
                    </small>
                  </div>
                  <Badge tone={member.role === 'OWNER' ? 'brand' : 'neutral'}>
                    {COMMUNITY_MEMBER_ROLE_LABELS[member.role]}
                  </Badge>
                  {member.role === 'OWNER' ? (
                    <span className={styles.lockedRole}>所有者角色不可在此变更</span>
                  ) : (
                    <Select
                      aria-label={`${card.displayName} 的角色`}
                      label="调整角色"
                      value={member.role}
                      disabled={
                        immutable ||
                        !canChangeMemberRoles ||
                        changeRole.isPending ||
                        removeMember.isPending
                      }
                      onChange={(event) =>
                        changeRole.mutate({
                          member,
                          nextRole: event.target.value as CommunityAssignableMemberRole,
                        })
                      }
                    >
                      <SelectOptions options={COMMUNITY_ASSIGNABLE_MEMBER_ROLE_OPTIONS} />
                    </Select>
                  )}
                  <IconButton
                    size="sm"
                    label={`将 ${card.displayName} 移出社群`}
                    icon={<Trash2 size={15} />}
                    disabled={
                      immutable || !canRemoveMembers || isChanging || removeMember.isPending
                    }
                    onClick={() => {
                      setRemoving(member);
                      setRemoveReason('');
                    }}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyPanel
            icon={<UsersRound size={28} />}
            title="当前条件没有成员"
            description={keyword ? '请修改当前页关键词或角色筛选。' : '该角色下暂无成员。'}
          />
        )}

        {members.data && members.data.total > PAGE_SIZE ? (
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

      <Modal
        open={Boolean(removing)}
        title="移出社群成员"
        description={
          removing
            ? `确认将 ${removing.userCard.displayName} 移出社群？该操作会写入正式审计日志。`
            : undefined
        }
        onClose={() => {
          if (!removeMember.isPending) setRemoving(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={removeMember.isPending}
              onClick={() => setRemoving(null)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              loading={removeMember.isPending}
              disabled={!removing}
              onClick={() => removing && removeMember.mutate(removing)}
            >
              确认移出
            </Button>
          </>
        }
      >
        <TextField
          multiline
          label="操作原因（可选）"
          name="remove-reason"
          value={removeReason}
          maxLength={200}
          onChange={(event) => setRemoveReason(event.target.value)}
          placeholder="原因会作为管理审计的一部分保存"
        />
      </Modal>
    </>
  );
}
