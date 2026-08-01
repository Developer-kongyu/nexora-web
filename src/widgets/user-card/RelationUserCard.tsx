import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, UserCheck, UserRoundX } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  describeUserRelationshipActionResult,
  performUserRelationshipAction,
  resolveUserRelationshipAction,
  userKeys,
  type UserListItemView,
  type UserRelationshipAction,
  type UserRelationSnapshotView,
} from '@/domains/users';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { paths } from '@/shared/config/paths';
import { formatDate } from '@/shared/lib/format';
import { Avatar, Button, Card, useToast } from '@/shared/ui';
import styles from './UserCard.module.css';

function formatFollowedAt(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return formatDate(timestamp);
}

function relationshipLabel(
  relationship: UserRelationSnapshotView | null,
  blocked: boolean,
): string {
  if (blocked) return '已屏蔽';
  if (!relationship) return '关系状态不可用';
  if (relationship.blockedByViewer) return '已屏蔽';
  if (relationship.blockedByTarget) return '对方已限制互动';
  if (relationship.following && relationship.followedBy) return '互相关注';
  if (relationship.outgoingFollowRequestPending) return '关注请求待通过';
  if (relationship.following) return '你已关注';
  if (relationship.followedBy) return '对方关注了你';
  return '尚未关注';
}

function actionLabel(
  action: UserRelationshipAction | null,
  relationship: UserRelationSnapshotView | null,
  blocked: boolean,
): string {
  if (relationship?.isSelf) return '当前账号';
  if (blocked || relationship?.blockedByViewer) return '已屏蔽';
  if (relationship?.blockedByTarget) return '不可关注';
  if (action === 'cancel-request') return '待通过';
  if (action === 'unfollow') return '已关注';
  return '关注';
}

export function RelationUserCard({ user }: { user: UserListItemView }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [relationship, setRelationship] = useSynchronizedState(
    user.relationship,
    user.relationship,
  );

  const blocked = user.blocked || Boolean(relationship?.blockedByViewer);
  const action = blocked ? null : resolveUserRelationshipAction(relationship);
  const followedAt = useMemo(() => formatFollowedAt(user.followedAt), [user.followedAt]);

  const relationMutation = useMutation({
    mutationFn: (nextAction: UserRelationshipAction) =>
      performUserRelationshipAction(user.handle, nextAction),
    onSuccess: (result) => {
      if (result.targetState === 'FOUND') setRelationship(result.relationship);
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      showToast({
        tone: result.targetState === 'FOUND' ? 'success' : 'warning',
        title: describeUserRelationshipActionResult(result),
      });
    },
    onError: () =>
      showToast({ tone: 'error', title: '关系操作失败', description: '请稍后重试。' }),
  });

  return (
    <Card className={styles.relationCard}>
      <Link className={styles.avatarLink} to={paths.profile(user.handle)}>
        <Avatar
          size="lg"
          fallback={user.displayName.slice(0, 1)}
          alt={user.displayName}
          src={user.avatarUrl}
        />
      </Link>
      <div className={styles.copy}>
        <Link to={paths.profile(user.handle)}>
          <strong>{user.displayName}</strong>
        </Link>
        <span>@{user.handle}</span>
        {user.bio ? <p>{user.bio}</p> : null}
        <div className={styles.relationMeta}>
          <span>
            {relationship?.following ? <UserCheck size={12} /> : <UserRoundX size={12} />}
            {relationshipLabel(relationship, blocked)}
          </span>
          {followedAt ? (
            <time dateTime={user.followedAt ?? undefined}>
              <CalendarDays size={12} /> {followedAt}
            </time>
          ) : null}
        </div>
      </div>
      <Button
        size="sm"
        variant={action === 'follow' ? 'primary' : 'secondary'}
        disabled={!action}
        loading={relationMutation.isPending}
        aria-label={`${actionLabel(action, relationship, blocked)} ${user.displayName}`}
        onClick={() => action && relationMutation.mutate(action)}
      >
        {actionLabel(action, relationship, blocked)}
      </Button>
    </Card>
  );
}
