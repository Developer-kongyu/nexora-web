import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MoreHorizontal, Pin, Settings, ShieldCheck, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  COMMUNITY_JOIN_POLICY_LABELS,
  COMMUNITY_MEMBER_ROLE_LABELS,
  COMMUNITY_VISIBILITY_LABELS,
  communitiesApi,
  communityKeys,
  communityManageKeys,
} from '@/domains/communities';
import { communityDetailToLegacy } from '@/domains/communities/lib/communityAdapter';
import { paths } from '@/shared/config/paths';
import { useCopyTextFeedback } from '@/shared/hooks/useCopyTextFeedback';
import { formatDate } from '@/shared/lib/format';
import { Avatar, Badge, Button, Card, IconButton, Modal, useToast } from '@/shared/ui';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { EmptyPanel, LoadingRows, SideCard } from '../_shared/PageParts';
import styles from './CommunityDetailPage.module.css';

const MEMBER_PAGE_SIZE = 20;
const COMMUNITY_TABS = ['主页', '成员', '关于'] as const;
type CommunityTab = (typeof COMMUNITY_TABS)[number];

export function CommunityDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<CommunityTab>('主页');
  const [memberPage, setMemberPage] = useState(1);
  const [moreOpen, setMoreOpen] = useState(false);

  const detail = useQuery({
    queryKey: communityKeys.detail(slug),
    queryFn: ({ signal }) => communitiesApi.getDetailBySlug(slug, signal),
    enabled: Boolean(slug),
  });

  const detailView = detail.data;
  const communityCard = detailView?.community;
  const community = detailView ? communityDetailToLegacy(detailView) : null;
  const communityId = communityCard?.communityId ?? '';
  const viewerContext = detailView?.viewerContext;
  const membershipStatus = viewerContext?.actorMembershipStatus ?? 'NONE';
  const joined = membershipStatus === 'ACTIVE';
  const membershipPending = membershipStatus === 'PENDING';
  const inviteOnly = communityCard?.joinPolicy === 'INVITE_ONLY' && !joined;
  const canManage = Boolean(viewerContext?.canManageCommunity);
  const canPublish = Boolean(viewerContext?.canPublishPost);

  const members = useQuery({
    queryKey: communityManageKeys.members(communityId, null, memberPage, MEMBER_PAGE_SIZE),
    queryFn: ({ signal }) =>
      communitiesApi.listMembers(
        communityId,
        { page: memberPage, pageSize: MEMBER_PAGE_SIZE, role: null },
        signal,
      ),
    enabled: Boolean(communityId),
  });

  const membershipAction = useMutation({
    mutationFn: async () => {
      if (!communityId) throw new Error('COMMUNITY_UNAVAILABLE');
      if (joined) {
        await communitiesApi.leave(communityId);
        return { kind: 'left' as const, pending: false };
      }
      const result = await communitiesApi.join(communityId);
      return { kind: 'joined' as const, pending: result.membershipStatus === 'PENDING' };
    },
    onSuccess: (result) => {
      showToast({
        tone: 'success',
        title:
          result.kind === 'left' ? '已退出社群' : result.pending ? '加入申请已提交' : '已加入社群',
      });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: communityKeys.detail(slug) }),
        queryClient.invalidateQueries({ queryKey: communityManageKeys.membersRoot(communityId) }),
      ]);
    },
    onError: () => showToast({ tone: 'error', title: '操作失败', description: '请稍后重试。' }),
  });

  const copyCommunityLink = useCopyTextFeedback({
    successTitle: '社群链接已复制',
    errorDescription: '请从地址栏复制链接。',
  });

  const openManagement = () => {
    setMoreOpen(false);
    if (!communityId || !canManage) return;
    void navigate(paths.communityManage(communityId));
  };

  const sideMembers = members.data?.list.slice(0, 5) ?? [];
  const remainingMemberCount = Math.max(0, (members.data?.total ?? 0) - sideMembers.length);
  const totalMemberPages = Math.max(1, Math.ceil((members.data?.total ?? 0) / MEMBER_PAGE_SIZE));
  const sortedRules = [...(detailView?.rules ?? [])].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  const membershipLabel = joined
    ? '已加入'
    : membershipPending
      ? '申请审核中'
      : inviteOnly
        ? '仅限邀请'
        : communityCard?.joinPolicy === 'APPROVAL'
          ? '申请加入'
          : '加入社群';

  return (
    <PageLayout
      aside={
        detail.isLoading ? (
          <LoadingRows count={3} compact />
        ) : communityCard ? (
          <>
            <SideCard title="关于社群">
              <p>{communityCard.description || '暂无社群简介'}</p>
              <ul style={{ marginTop: 12 }}>
                <li>
                  <UsersRound size={13} /> {communityCard.memberCount.toLocaleString()} 位成员
                </li>
                <li>
                  <ShieldCheck size={13} /> {COMMUNITY_VISIBILITY_LABELS[communityCard.visibility]}{' '}
                  · {COMMUNITY_JOIN_POLICY_LABELS[communityCard.joinPolicy]}
                </li>
                <li>
                  <Pin size={13} /> {communityCard.pinnedPostCount.toLocaleString()} 条置顶内容
                </li>
              </ul>
            </SideCard>
            <SideCard title="社群规则" action="查看全部" to={paths.communityAbout(slug)}>
              {sortedRules.length ? (
                <ol className={styles.rules}>
                  {sortedRules.map((rule) => (
                    <li key={`${rule.sortOrder}:${rule.content}`}>
                      <span>{rule.sortOrder}</span>
                      {rule.content}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.mutedText}>当前社群尚未设置规则。</p>
              )}
            </SideCard>
            <SideCard title="社群成员">
              {members.isLoading ? (
                <LoadingRows count={1} compact />
              ) : sideMembers.length ? (
                <div className={styles.members}>
                  {sideMembers.map((member) => (
                    <Link
                      key={member.userId}
                      to={paths.profile(member.userCard.handle)}
                      title={member.userCard.displayName}
                    >
                      <Avatar
                        size="sm"
                        src={member.userCard.avatarUrl ?? undefined}
                        fallback={member.userCard.displayName.slice(0, 1)}
                        alt={member.userCard.displayName}
                      />
                    </Link>
                  ))}
                  {remainingMemberCount > 0 ? <span>+{remainingMemberCount}</span> : null}
                </div>
              ) : (
                <p className={styles.mutedText}>暂无可展示成员。</p>
              )}
            </SideCard>
          </>
        ) : null
      }
    >
      <Stack>
        {detail.isLoading ? <LoadingRows count={2} /> : null}
        {detail.isError ? (
          <Card>
            <EmptyPanel
              title="社群资料加载失败"
              description="请检查网络连接后重新加载。"
              action={<Button onClick={() => void detail.refetch()}>重新加载</Button>}
            />
          </Card>
        ) : null}

        {communityCard && community ? (
          <Card className={styles.hero}>
            <div className={styles.cover}>
              {communityCard.coverUrl ? (
                <img className={styles.coverImage} src={communityCard.coverUrl} alt="" />
              ) : (
                <span>{communityCard.name.slice(0, 2)}</span>
              )}
              <i />
              <b />
            </div>
            <div className={styles.header}>
              <Avatar
                className={styles.avatar}
                size="xl"
                src={communityCard.avatarUrl ?? undefined}
                fallback={communityCard.name.slice(0, 2)}
                alt={communityCard.name}
              />
              <div className={styles.identity}>
                <div>
                  <h1>{communityCard.name}</h1>
                  <Badge tone="brand">
                    {COMMUNITY_VISIBILITY_LABELS[communityCard.visibility]}
                  </Badge>
                </div>
                <span>/{communityCard.slug}</span>
                <p>{communityCard.description || '暂无社群简介'}</p>
                <small>
                  <UsersRound size={13} /> {communityCard.memberCount.toLocaleString()} 位成员 ·{' '}
                  {communityCard.postCount.toLocaleString()} 条讨论
                </small>
                {communityCard.tags.length ? (
                  <div className={styles.tags}>
                    {communityCard.tags.map((tag) => (
                      <Badge key={tag} tone="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className={styles.actions}>
                <Button
                  variant={joined ? 'secondary' : 'primary'}
                  loading={membershipAction.isPending}
                  disabled={membershipPending || inviteOnly || !viewerContext}
                  onClick={() => membershipAction.mutate()}
                >
                  {membershipLabel}
                </Button>
                <IconButton
                  label="更多社群操作"
                  icon={<MoreHorizontal size={18} />}
                  onClick={() => setMoreOpen(true)}
                />
              </div>
            </div>
            <nav>
              {COMMUNITY_TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  data-active={tab === item}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
              <Button
                size="sm"
                disabled={!canPublish}
                onClick={() => void navigate(paths.composeForCommunity(communityId))}
              >
                <span>{canPublish ? '在社群发帖' : '暂无发帖权限'}</span>
              </Button>
            </nav>
          </Card>
        ) : null}

        {tab === '主页' && communityCard && community ? (
          <>
            <div className={styles.sectionHeading}>
              <div>
                <h2>置顶内容</h2>
                <p>由社群管理成员通过后端置顶接口维护。</p>
              </div>
              <Badge tone="brand">{communityCard.pinnedPostCount} 条</Badge>
            </div>
            {community.posts.length ? (
              <div className={styles.feed}>
                {community.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    pinned
                    post={{
                      ...post,
                      community: {
                        id: communityCard.communityId,
                        name: communityCard.name,
                        slug: communityCard.slug,
                      },
                      variant: 'community',
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyPanel
                  icon={<Pin size={28} />}
                  title="暂无置顶内容"
                  description="社群当前没有可展示的置顶帖子。"
                />
              </Card>
            )}
          </>
        ) : null}

        {tab === '成员' ? (
          <Card className={styles.contentPanel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>社群成员</h2>
                <p>成员、角色与加入时间均来自后端成员列表。</p>
              </div>
              <Badge tone="brand">
                {members.data?.total ?? communityCard?.memberCount ?? 0} 位
              </Badge>
            </header>
            {members.isLoading ? (
              <div className={styles.panelBody}>
                <LoadingRows count={4} compact />
              </div>
            ) : members.isError ? (
              <EmptyPanel
                title="成员列表加载失败"
                description="请检查网络连接后重新加载。"
                action={<Button onClick={() => void members.refetch()}>重新加载</Button>}
              />
            ) : members.data?.list.length ? (
              <div className={styles.memberList}>
                {members.data.list.map((member) => (
                  <article key={member.userId} className={styles.memberRow}>
                    <Link to={paths.profile(member.userCard.handle)}>
                      <Avatar
                        src={member.userCard.avatarUrl ?? undefined}
                        fallback={member.userCard.displayName.slice(0, 1)}
                        alt={member.userCard.displayName}
                      />
                    </Link>
                    <div className={styles.memberIdentity}>
                      <Link to={paths.profile(member.userCard.handle)}>
                        <strong>{member.userCard.displayName}</strong>
                      </Link>
                      <span>@{member.userCard.handle}</span>
                      <small>
                        {COMMUNITY_MEMBER_ROLE_LABELS[member.role]} ·{' '}
                        {formatDate(member.joinedAtIso)}加入 ·{' '}
                        {member.userCard.followersCount.toLocaleString()} 位关注者
                      </small>
                    </div>
                    <Badge tone={member.role === 'OWNER' ? 'brand' : 'neutral'}>
                      {COMMUNITY_MEMBER_ROLE_LABELS[member.role]}
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(paths.profile(member.userCard.handle))}
                    >
                      查看资料
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={<UsersRound size={28} />}
                title="暂无成员"
                description="后端成员列表当前为空。"
              />
            )}
            {members.data && members.data.total > MEMBER_PAGE_SIZE ? (
              <div className={styles.pagination}>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={memberPage <= 1}
                  onClick={() => setMemberPage((page) => Math.max(1, page - 1))}
                >
                  上一页
                </Button>
                <span>
                  第 {memberPage} / {totalMemberPages} 页
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={memberPage >= totalMemberPages}
                  onClick={() => setMemberPage((page) => Math.min(totalMemberPages, page + 1))}
                >
                  下一页
                </Button>
              </div>
            ) : null}
          </Card>
        ) : null}

        {tab === '关于' && detailView && communityCard ? (
          <Card className={styles.contentPanel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>社群介绍与规则</h2>
                <p>资料、规则和管理成员均来自社群详情接口。</p>
              </div>
              {canManage ? (
                <Button variant="secondary" onClick={openManagement}>
                  <Settings size={15} /> 打开管理台
                </Button>
              ) : null}
            </header>
            <div className={styles.aboutContent}>
              <section>
                <h3>社群简介</h3>
                <p>{communityCard.description || '暂无社群简介'}</p>
              </section>
              <section>
                <h3>社群规则</h3>
                {sortedRules.length ? (
                  <ol className={styles.rules}>
                    {sortedRules.map((rule) => (
                      <li key={`about:${rule.sortOrder}:${rule.content}`}>
                        <span>{rule.sortOrder}</span>
                        {rule.content}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.mutedText}>当前社群尚未设置规则。</p>
                )}
              </section>
              <section>
                <h3>管理成员</h3>
                <div className={styles.managerList}>
                  {detailView.managers.map((manager, index) =>
                    manager.state === 'READY' ? (
                      <Link
                        key={manager.userId}
                        to={paths.profile(manager.userCard.handle)}
                        className={styles.managerRow}
                      >
                        <Avatar
                          size="sm"
                          src={manager.userCard.avatarUrl ?? undefined}
                          fallback={manager.userCard.displayName.slice(0, 1)}
                          alt={manager.userCard.displayName}
                        />
                        <span>
                          <strong>{manager.userCard.displayName}</strong>
                          <small>{COMMUNITY_MEMBER_ROLE_LABELS[manager.role]}</small>
                        </span>
                      </Link>
                    ) : (
                      <div key={`${manager.role}:${index}`} className={styles.managerRow}>
                        <Avatar size="sm" fallback="管" alt="管理成员资料暂不可用" />
                        <span>
                          <strong>资料暂不可用</strong>
                          <small>{COMMUNITY_MEMBER_ROLE_LABELS[manager.role]}</small>
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </section>
            </div>
          </Card>
        ) : null}
      </Stack>

      <Modal
        open={moreOpen}
        title="社群操作"
        description="复制社群链接；具有后端管理权限的成员可进入管理台。"
        onClose={() => setMoreOpen(false)}
        footer={<Button onClick={() => setMoreOpen(false)}>完成</Button>}
      >
        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            onClick={() => {
              setMoreOpen(false);
              void copyCommunityLink(`${window.location.origin}/communities/${slug}`);
            }}
          >
            <Copy size={15} /> 复制社群链接
          </Button>
          {canManage ? (
            <Button variant="secondary" onClick={openManagement}>
              <Settings size={15} /> 进入管理台
            </Button>
          ) : null}
        </div>
      </Modal>
    </PageLayout>
  );
}
