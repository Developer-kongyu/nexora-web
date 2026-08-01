import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usersApi, type UserSummary } from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { useOptimisticBooleanMutation } from '@/shared/hooks/useOptimisticBooleanMutation';
import { Avatar, Button, Card, useToast } from '@/shared/ui';
import styles from './UserCard.module.css';

export function UserCard({
  user,
  compact = false,
  selectable = false,
  selected = false,
  onSelect,
}: {
  user: UserSummary;
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { showToast } = useToast();

  const relation = useOptimisticBooleanMutation({
    value: Boolean(user.isFollowing),
    mutationFn: async (nextFollowing: boolean) => {
      if (nextFollowing) {
        await usersApi.follow(user.handle);
        return;
      }
      await usersApi.unfollow(user.handle);
    },
    onSuccess: (_, nextFollowing) =>
      showToast({
        tone: 'success',
        title: nextFollowing ? `已关注 ${user.displayName}` : `已取消关注 ${user.displayName}`,
      }),
    onError: (_, attemptedFollowing) =>
      showToast({
        tone: 'error',
        title: attemptedFollowing ? '关注失败' : '取消关注失败',
        description: '状态已回滚，请检查网络后重试。',
      }),
  });

  return (
    <Card className={styles.card} data-compact={compact}>
      <Link to={paths.profile(user.handle)}>
        <Avatar
          size={compact ? 'md' : 'lg'}
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
        {!compact && user.bio ? <p>{user.bio}</p> : null}
        {!compact ? (
          <small>
            <MapPin size={12} /> 上海 · {user.followersCount?.toLocaleString('zh-CN') || 0} 位关注者
          </small>
        ) : null}
      </div>
      {selectable ? (
        <button type="button" className={styles.select} data-selected={selected} onClick={onSelect}>
          {selected ? '已选择' : '选择'}
        </button>
      ) : (
        <Button
          size="sm"
          variant={relation.value ? 'secondary' : 'primary'}
          loading={relation.mutation.isPending}
          onClick={relation.toggle}
        >
          {relation.value ? '已关注' : '关注'}
        </Button>
      )}
    </Card>
  );
}
