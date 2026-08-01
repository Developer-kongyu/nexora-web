import { UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { communitiesApi, type CommunitySummary } from '@/domains/communities';
import { paths } from '@/shared/config/paths';
import { useOptimisticBooleanMutation } from '@/shared/hooks/useOptimisticBooleanMutation';
import { formatCount } from '@/shared/lib/format';
import { Avatar, Button, Card, useToast } from '@/shared/ui';
import styles from './CommunityCard.module.css';

export function CommunityCard({
  community,
  featured = false,
}: {
  community: CommunitySummary;
  featured?: boolean;
}) {
  const { showToast } = useToast();

  const membership = useOptimisticBooleanMutation({
    value: Boolean(community.joined),
    mutationFn: async (nextJoined: boolean) => {
      if (nextJoined) {
        await communitiesApi.join(community.id);
        return;
      }
      await communitiesApi.leave(community.id);
    },
    onSuccess: (_, nextJoined) =>
      showToast({
        tone: 'success',
        title: nextJoined ? `已加入 ${community.name}` : `已退出 ${community.name}`,
      }),
    onError: (_, attemptedJoined) =>
      showToast({
        tone: 'error',
        title: attemptedJoined ? '加入社群失败' : '退出社群失败',
        description: '状态已回滚，请检查网络后重试。',
      }),
  });

  return (
    <Card className={styles.card} data-featured={featured}>
      {featured ? <div className={styles.cover} /> : null}
      <div className={styles.row}>
        <Link to={paths.community(community.slug)}>
          <Avatar
            size={featured ? 'lg' : 'md'}
            fallback={community.name.slice(0, 2)}
            alt={community.name}
            src={community.avatarUrl}
          />
        </Link>
        <div className={styles.copy}>
          <Link to={paths.community(community.slug)}>
            <strong>{community.name}</strong>
          </Link>
          <span>
            <UsersRound size={13} /> {formatCount(community.membersCount)} 成员
          </span>
          <p>{community.description}</p>
        </div>
        <Button
          size="sm"
          variant={membership.value ? 'secondary' : 'primary'}
          loading={membership.mutation.isPending}
          onClick={membership.toggle}
        >
          {membership.value ? '已加入' : '加入'}
        </Button>
      </div>
    </Card>
  );
}
