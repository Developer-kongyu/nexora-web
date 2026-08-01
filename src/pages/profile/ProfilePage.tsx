import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  Cake,
  Copy,
  Link as LinkIcon,
  MapPin,
  MoreHorizontal,
  PenLine,
  Pin,
  ShieldAlert,
  UserMinus,
  UserRoundCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { postsApi } from '@/domains/posts';
import {
  describeUserRelationshipActionResult,
  performUserRelationshipAction,
  resolveUserRelationshipAction,
  userKeys,
  usersApi,
  type BlockUserResult,
  type DeleteUserRelationResult,
  type UpsertUserMuteResult,
  type UserProfileHeaderView,
  type UserRelationshipAction,
  type UserRelationSnapshotView,
} from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { useCopyTextFeedback } from '@/shared/hooks/useCopyTextFeedback';
import { getUrlHostname } from '@/shared/lib/url';
import { Avatar, Badge, Button, Card, IconButton, Modal, useToast } from '@/shared/ui';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { EmptyPanel, LoadingRows, SideCard } from '../_shared/PageParts';
import styles from './ProfilePage.module.css';

const profileTabs = ['帖子', '媒体'] as const;
type ProfileTab = (typeof profileTabs)[number];

function relationLabel(relation: UserRelationSnapshotView | null | undefined): string {
  if (!relation) return '登录后可查看关系状态';
  if (relation.isSelf) return '这是你自己的主页';
  if (relation.blockedByViewer) return '你已屏蔽此用户';
  if (relation.blockedByTarget) return '该用户限制了与你的互动';
  if (relation.summary === 'MUTUAL') return '你们已互相关注';
  if (relation.outgoingFollowRequestPending) return '关注请求等待对方审批';
  if (relation.incomingFollowRequestPending) return '对方的关注请求等待你审批';
  if (relation.following) return '你正在关注此用户';
  if (relation.followedBy) return '此用户正在关注你';
  return '你们暂未建立关注关系';
}

function followButtonLabel(relation: UserRelationSnapshotView | null | undefined): string {
  if (relation?.outgoingFollowRequestPending) return '已请求';
  if (relation?.following) return '已关注';
  return '关注';
}

function applyRelationship(
  profile: UserProfileHeaderView | undefined,
  relationship: UserRelationSnapshotView | null,
): UserProfileHeaderView | undefined {
  if (!profile) return profile;
  return { ...profile, relationship };
}

export function ProfilePage() {
  const { handle = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const [tab, setTab] = useState<ProfileTab>('帖子');
  const [menuOpen, setMenuOpen] = useState(false);

  const profileKey = userKeys.profile(handle);
  const profile = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => usersApi.profile(handle, signal),
    enabled: Boolean(handle),
  });
  const posts = useQuery({
    queryKey: userKeys.profilePosts(handle),
    queryFn: ({ signal }) => postsApi.byAuthor(handle, undefined, signal),
    enabled: Boolean(handle),
  });

  const own = Boolean(profile.data && currentUser?.id === profile.data.userId);
  const relationship = profile.data?.relationship;

  const updateRelationship = (next: UserRelationSnapshotView | null) => {
    queryClient.setQueryData<UserProfileHeaderView | undefined>(profileKey, (current) =>
      applyRelationship(current, next),
    );
  };

  const followMutation = useMutation({
    mutationFn: (action: UserRelationshipAction) =>
      performUserRelationshipAction(handle, action),
    onSuccess: (result) => {
      if (result.targetState === 'FOUND') updateRelationship(result.relationship);
      else void profile.refetch();

      showToast({
        tone: result.targetState === 'FOUND' ? 'success' : 'warning',
        title: describeUserRelationshipActionResult(result),
      });
    },
    onError: () =>
      showToast({ tone: 'error', title: '操作失败', description: '请稍后重试。' }),
  });

  const muteMutation = useMutation<
    UpsertUserMuteResult | DeleteUserRelationResult,
    Error,
    boolean
  >({
    mutationFn: (muted: boolean) =>
      muted
        ? usersApi.unmute(handle)
        : usersApi.mute(handle, { mutePosts: true, muteNotifications: true }),
    onSuccess: (result, wasMuted) => {
      if (result.targetState === 'FOUND') updateRelationship(result.relationship);
      else void profile.refetch();
      setMenuOpen(false);
      showToast({ tone: 'success', title: wasMuted ? '已取消静音' : '已静音该用户' });
    },
    onError: () =>
      showToast({ tone: 'error', title: '静音设置失败', description: '请稍后重试。' }),
  });

  const blockMutation = useMutation<
    BlockUserResult | DeleteUserRelationResult,
    Error,
    boolean
  >({
    mutationFn: (blocked: boolean) =>
      blocked ? usersApi.unblock(handle) : usersApi.block(handle),
    onSuccess: (result, wasBlocked) => {
      if (result.targetState === 'FOUND') updateRelationship(result.relationship);
      else void profile.refetch();
      setMenuOpen(false);
      void queryClient.invalidateQueries({ queryKey: userKeys.profilePosts(handle) });
      showToast({ tone: 'success', title: wasBlocked ? '已取消屏蔽' : '已屏蔽该用户' });
    },
    onError: () =>
      showToast({ tone: 'error', title: '屏蔽设置失败', description: '请稍后重试。' }),
  });

  const visiblePosts = useMemo(() => {
    const list = posts.data?.list ?? [];
    return tab === '媒体' ? list.filter((post) => post.media.length > 0) : list;
  }, [posts.data?.list, tab]);

  const copyProfileLink = useCopyTextFeedback({
    successTitle: '个人主页链接已复制',
    errorDescription: '请从地址栏复制链接。',
  });

  const triggerFollowAction = () => {
    const action = resolveUserRelationshipAction(relationship ?? null);
    if (action) followMutation.mutate(action);
  };

  const interactionBlocked = Boolean(
    relationship?.blockedByViewer || relationship?.blockedByTarget,
  );
  const muted = Boolean(relationship?.mutePosts || relationship?.muteNotifications);
  const blocked = Boolean(relationship?.blockedByViewer);

  return (
    <PageLayout
      aside={
        <>
          <SideCard title="关系概览">
            <div className={styles.relationGrid}>
              <Link to={paths.profileFollowing(handle)}>
                <strong>{profile.data?.stats.followingCount ?? 0}</strong>
                <span>正在关注</span>
              </Link>
              <Link to={paths.profileFollowers(handle)}>
                <strong>{profile.data?.stats.followersCount ?? 0}</strong>
                <span>关注者</span>
              </Link>
            </div>
          </SideCard>
          <SideCard title="当前关系">
            <div className={styles.relationStatus}>
              <span data-blocked={interactionBlocked}>
                {interactionBlocked ? <ShieldAlert size={17} /> : <UserRoundCheck size={17} />}
              </span>
              <div>
                <strong>{relationLabel(relationship)}</strong>
                <p>关系状态以服务端实时快照为准。</p>
              </div>
            </div>
          </SideCard>
          {own ? (
            <SideCard title="仅自己可见">
              <Link className={styles.privateLink} to="/bookmarks">
                <span className={styles.privateIcon}>
                  <Pin size={16} />
                </span>
                <span>
                  <strong>我的收藏夹</strong>
                  <small>管理私密与公开收藏集合</small>
                </span>
              </Link>
            </SideCard>
          ) : null}
        </>
      }
    >
      <Stack>
        {profile.isLoading ? (
          <LoadingRows count={1} />
        ) : profile.isError ? (
          <Card>
            <EmptyPanel
              icon={<ShieldAlert size={24} />}
              title="无法加载个人主页"
              description="用户不存在、资料不可见，或网络连接暂时不可用。"
              action={
                <Button variant="secondary" onClick={() => void profile.refetch()}>
                  重新加载
                </Button>
              }
            />
          </Card>
        ) : profile.data ? (
          <Card className={styles.profile}>
            <div className={styles.cover}>
              {profile.data.coverUrl ? (
                <img src={profile.data.coverUrl} alt="" className={styles.coverImage} />
              ) : (
                <span className={styles.coverShape} />
              )}
            </div>
            <div className={styles.profileBody}>
              <div className={styles.avatarRow}>
                <Avatar
                  className={styles.avatar}
                  size="xl"
                  fallback={profile.data.displayName.slice(0, 1)}
                  alt={profile.data.displayName}
                  src={profile.data.avatarUrl}
                />
                <div className={styles.profileActions}>
                  {own ? (
                    <Button variant="secondary" onClick={() => navigate('/settings/profile')}>
                      <PenLine size={15} /> 编辑资料
                    </Button>
                  ) : (
                    <Button
                      variant={
                        relationship?.following || relationship?.outgoingFollowRequestPending
                          ? 'secondary'
                          : 'primary'
                      }
                      loading={followMutation.isPending}
                      disabled={interactionBlocked}
                      onClick={triggerFollowAction}
                    >
                      {followButtonLabel(relationship)}
                    </Button>
                  )}
                  <IconButton
                    label="更多用户操作"
                    icon={<MoreHorizontal size={18} />}
                    onClick={() => setMenuOpen(true)}
                  />
                </div>
              </div>
              <div className={styles.identity}>
                <div className={styles.name}>
                  <h1>{profile.data.displayName}</h1>
                  {own ? <Badge tone="brand">本人</Badge> : null}
                </div>
                <span>@{profile.data.handle}</span>
                {profile.data.bio ? <p>{profile.data.bio}</p> : null}
                <div className={styles.meta}>
                  {profile.data.location ? (
                    <span>
                      <MapPin size={14} /> {profile.data.location}
                    </span>
                  ) : null}
                  {profile.data.websiteUrl ? (
                    <a href={profile.data.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <LinkIcon size={14} /> {getUrlHostname(profile.data.websiteUrl)}
                    </a>
                  ) : null}
                  {profile.data.birthday ? (
                    <span>
                      <Cake size={14} /> {profile.data.birthday}
                    </span>
                  ) : null}
                </div>
              </div>
              <nav className={styles.tabs} aria-label="个人主页内容分类">
                {profileTabs.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={tab === item ? styles.active : undefined}
                    aria-pressed={tab === item}
                    onClick={() => setTab(item)}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>
          </Card>
        ) : null}

        {interactionBlocked ? (
          <Card className={styles.relationWarning}>
            <ShieldAlert size={18} />
            <div>
              <strong>{blocked ? '你已屏蔽此用户' : '当前无法查看该用户的公开动态'}</strong>
              <p>解除屏蔽或关系限制后，内容列表会重新从服务端加载。</p>
            </div>
          </Card>
        ) : posts.isLoading ? (
          <LoadingRows />
        ) : posts.isError ? (
          <Card>
            <EmptyPanel
              title="动态加载失败"
              description="请检查网络后重新加载。"
              action={
                <Button variant="secondary" onClick={() => void posts.refetch()}>
                  重新加载
                </Button>
              }
            />
          </Card>
        ) : visiblePosts.length ? (
          <div className={styles.feed}>
            {visiblePosts.map((post, index) => (
              <PostCard
                key={`${tab}-${post.id}`}
                post={{ ...post, variant: 'profile' }}
                pinned={tab === '帖子' && profile.data?.pinnedPostIds.includes(post.id) && index < 3}
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyPanel
              icon={<Pin size={22} />}
              title={`暂无${tab}内容`}
              description={own ? '发布内容后会显示在这里。' : '该用户尚未公开相关内容。'}
              action={own ? <Button onClick={() => navigate('/compose')}>开始创作</Button> : undefined}
            />
          </Card>
        )}
      </Stack>

      <Modal
        open={menuOpen}
        title="用户操作"
        description={`管理与 @${handle} 的互动关系。`}
        onClose={() => setMenuOpen(false)}
        footer={<Button onClick={() => setMenuOpen(false)}>完成</Button>}
      >
        <div className={styles.actionMenu}>
          <Button
            variant="secondary"
            onClick={() => {
              setMenuOpen(false);
              void copyProfileLink(`${window.location.origin}${paths.profile(handle)}`);
            }}
          >
            <Copy size={15} /> 复制主页链接
          </Button>
          {!own ? (
            <>
              <Button
                variant="secondary"
                loading={muteMutation.isPending}
                disabled={Boolean(relationship?.blockedByTarget)}
                onClick={() => muteMutation.mutate(muted)}
              >
                {muted ? <Bell size={15} /> : <BellOff size={15} />}
                {muted ? '取消静音' : '静音帖子与通知'}
              </Button>
              <Button
                variant={blocked ? 'secondary' : 'danger'}
                loading={blockMutation.isPending}
                disabled={Boolean(relationship?.blockedByTarget)}
                onClick={() => blockMutation.mutate(blocked)}
              >
                <UserMinus size={15} /> {blocked ? '取消屏蔽' : '屏蔽用户'}
              </Button>
            </>
          ) : null}
        </div>
      </Modal>
    </PageLayout>
  );
}
