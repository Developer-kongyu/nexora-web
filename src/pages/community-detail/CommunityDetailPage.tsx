import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  ChevronRight,
  Copy,
  Info,
  MoreHorizontal,
  Pin,
  Settings,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { communitiesApi, communityKeys } from '@/domains/communities';
import { postsApi } from '@/domains/posts';
import { paths } from '@/shared/config/paths';
import { useCopyTextFeedback } from '@/shared/hooks/useCopyTextFeedback';
import { useOptimisticBooleanMutation } from '@/shared/hooks/useOptimisticBooleanMutation';
import { Avatar, Badge, Button, Card, IconButton, Modal, useToast } from '@/shared/ui';
import { PageLayout, Stack } from '@/widgets/layout/PageLayout';
import { PostCard } from '@/widgets/post-card/PostCard';
import { LoadingRows, SideCard } from '../_shared/PageParts';
import styles from './CommunityDetailPage.module.css';

const activeMembers = [
  { name: '小明同学', handle: 'xiaoming', role: '版主', posts: 86 },
  { name: '程序员阿强', handle: 'aqiang_dev', role: '活跃成员', posts: 52 },
  { name: '产品小助手', handle: 'pm_helper', role: '活跃成员', posts: 41 },
  { name: '旅行记录本', handle: 'travel_log', role: '成员', posts: 18 },
];

export function CommunityDetailPage() {
  const { slug = 'ai-product' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab] = useState('主页');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const community = useQuery({
    queryKey: communityKeys.detail(slug),
    queryFn: () => communitiesApi.detail(slug),
  });
  const posts = useQuery({
    queryKey: communityKeys.posts(slug),
    queryFn: ({ signal }) => postsApi.byCommunity(slug, undefined, signal),
  });

  const membership = useOptimisticBooleanMutation({
    value: Boolean(community.data?.joined),
    mutationFn: async (nextJoined: boolean) => {
      const communityId = community.data?.id;
      if (!communityId) throw new Error('COMMUNITY_UNAVAILABLE');
      if (nextJoined) {
        await communitiesApi.join(communityId);
        return;
      }
      await communitiesApi.leave(communityId);
    },
    onSuccess: (_, nextJoined) =>
      showToast({
        tone: 'success',
        title: nextJoined ? '已加入社群' : '已退出社群',
      }),
    onError: () => showToast({ tone: 'error', title: '操作失败', description: '请稍后重试。' }),
  });
  const joined = membership.value;

  const copyCommunityLink = useCopyTextFeedback({
    successTitle: '社群链接已复制',
    errorDescription: '请从地址栏复制链接。',
  });

  const openManagement = () => {
    setMoreOpen(false);
    const communityId = community.data?.id;
    if (!communityId) {
      showToast({
        tone: 'error',
        title: '社群资料尚未加载',
        description: '请等待资料加载完成后重试。',
      });
      return;
    }
    void navigate(paths.communityManage(communityId));
  };

  const communityPosts = posts.data?.list ?? [];

  return (
    <PageLayout
      aside={
        <>
          <SideCard title="关于社群">
            <p>{community.data?.description || '围绕主题展开高质量讨论。'}</p>
            <ul style={{ marginTop: 12 }}>
              <li>
                <UsersRound size={13} /> {community.data?.membersCount.toLocaleString() || '12,800'}{' '}
                位成员
              </li>
              <li>
                <ShieldCheck size={13} />{' '}
                {community.data?.visibility === 'private' ? '私密社群' : '公开社群'} ·{' '}
                {community.data?.joinMode === 'approval' ? '申请加入' : '开放加入'}
              </li>
              <li>
                <Bell size={13} /> 每周精选与活动通知
              </li>
            </ul>
          </SideCard>
          <SideCard title="社群规则" action="查看全部" to={paths.communityAbout(slug)}>
            <ol className={styles.rules}>
              {community.data?.rules.map((rule, index) => (
                <li key={rule}>
                  <span>{index + 1}</span>
                  {rule}
                </li>
              ))}
            </ol>
          </SideCard>
          <SideCard title="活跃成员">
            <div className={styles.members}>
              {activeMembers.map((member) => (
                <Link key={member.handle} to={paths.profile(member.handle)} title={member.name}>
                  <Avatar size="sm" fallback={member.name.slice(0, 1)} alt={member.name} />
                </Link>
              ))}
              <span>+1.2k</span>
            </div>
          </SideCard>
        </>
      }
    >
      <Stack>
        {community.isLoading ? (
          <LoadingRows count={1} />
        ) : community.data ? (
          <Card className={styles.hero}>
            <div className={styles.cover}>
              <span>AI</span>
              <i />
              <b />
            </div>
            <div className={styles.header}>
              <Avatar
                className={styles.avatar}
                size="xl"
                fallback={community.data.name.slice(0, 2)}
                alt={community.data.name}
              />
              <div className={styles.identity}>
                <div>
                  <h1>{community.data.name}</h1>
                  <Badge tone="brand">官方推荐</Badge>
                </div>
                <span>/{community.data.slug}</span>
                <p>{community.data.description}</p>
                <small>
                  <UsersRound size={13} /> {community.data.membersCount.toLocaleString()} 成员 ·
                  今天 86 条新讨论
                </small>
              </div>
              <div className={styles.actions}>
                <Button
                  variant={joined ? 'secondary' : 'primary'}
                  loading={membership.mutation.isPending}
                  disabled={!community.data}
                  onClick={membership.toggle}
                >
                  {joined ? '已加入' : '加入社群'}
                </Button>
                <IconButton
                  label={notificationsEnabled ? '关闭社群通知' : '开启社群通知'}
                  icon={notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                  onClick={() => {
                    setNotificationsEnabled((value) => !value);
                    showToast({
                      tone: 'success',
                      title: notificationsEnabled ? '社群通知已关闭' : '社群通知已开启',
                    });
                  }}
                />
                <IconButton
                  label="更多社群操作"
                  icon={<MoreHorizontal size={18} />}
                  onClick={() => setMoreOpen(true)}
                />
              </div>
            </div>
            <nav>
              {['主页', '精华', '成员', '关于'].map((item) => (
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
                disabled={!joined}
                onClick={() => {
                  if (community.data) void navigate(paths.composeForCommunity(community.data.id));
                }}
              >
                <span>{joined ? '在社群发帖' : '加入后发帖'}</span>
              </Button>
            </nav>
          </Card>
        ) : null}

        {tab === '主页' ? (
          <>
            <Card className={styles.announcement}>
              <span className={styles.pin}>
                <Pin size={17} />
              </span>
              <div>
                <Badge tone="warning">置顶公告</Badge>
                <h2>欢迎加入 AI 产品讨论组：请先阅读发帖规范</h2>
                <p>分享真实实践、失败复盘和可验证的方法。引用外部内容时请注明来源。</p>
              </div>
              <button type="button" aria-label="查看公告" onClick={() => setTab('关于')}>
                <ChevronRight size={18} />
              </button>
            </Card>
            {posts.isLoading ? (
              <LoadingRows count={2} />
            ) : (
              <div className={styles.feed}>
                {communityPosts.slice(0, 3).map((post, index) => (
                  <PostCard
                    key={post.id}
                    pinned={index === 0}
                    post={{
                      ...post,
                      community: {
                        id: community.data?.id || 'c-1',
                        name: community.data?.name || 'AI 产品讨论组',
                        slug,
                      },
                      variant: index === 0 ? 'announcement' : 'community',
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}

        {tab === '精华' ? (
          <div className={styles.feed}>
            {communityPosts.slice(0, 2).map((post, index) => (
              <PostCard
                key={`featured-${post.id}`}
                pinned={index === 0}
                post={{
                  ...post,
                  community: {
                    id: community.data?.id || 'c-1',
                    name: community.data?.name || 'AI 产品讨论组',
                    slug,
                  },
                  variant: 'community',
                }}
              />
            ))}
          </div>
        ) : null}

        {tab === '成员' ? (
          <Card className={styles.tabPanel}>
            <UsersRound size={28} />
            <h2>活跃成员</h2>
            <p>按近期发帖、评论与社群贡献排序。</p>
            <div style={{ display: 'grid', width: '100%', gap: 10, marginTop: 16 }}>
              {activeMembers.map((member) => (
                <article
                  key={member.handle}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    textAlign: 'left',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                  }}
                >
                  <Avatar fallback={member.name.slice(0, 1)} alt={member.name} />
                  <div>
                    <strong>{member.name}</strong>
                    <p>
                      @{member.handle} · {member.role} · 本月 {member.posts} 次贡献
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(paths.profile(member.handle))}
                  >
                    查看资料
                  </Button>
                </article>
              ))}
            </div>
          </Card>
        ) : null}

        {tab === '关于' ? (
          <Card className={styles.tabPanel}>
            <Info size={28} />
            <h2>社群介绍与规则</h2>
            <p>{community.data?.description}</p>
            <ol
              className={styles.rules}
              style={{ width: '100%', marginTop: 14, textAlign: 'left' }}
            >
              {community.data?.rules.map((rule, index) => (
                <li key={`about-${rule}`}>
                  <span>{index + 1}</span>
                  {rule}
                </li>
              ))}
            </ol>
            {slug === 'ai-product' ? (
              <Button variant="secondary" onClick={openManagement}>
                <Settings size={15} /> 打开管理台
              </Button>
            ) : null}
          </Card>
        ) : null}
      </Stack>

      <Modal
        open={moreOpen}
        title="社群操作"
        description="分享社群，或管理当前成员关系。"
        onClose={() => setMoreOpen(false)}
        footer={<Button onClick={() => setMoreOpen(false)}>完成</Button>}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <Button
            variant="secondary"
            onClick={() => {
              setMoreOpen(false);
              void copyCommunityLink(`${window.location.origin}/communities/${slug}`);
            }}
          >
            <Copy size={15} /> 复制社群链接
          </Button>
          {slug === 'ai-product' ? (
            <Button variant="secondary" onClick={openManagement}>
              <Settings size={15} /> 进入管理台
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              setMoreOpen(false);
              showToast({ tone: 'success', title: '已提交社群反馈' });
            }}
          >
            <UserCheck size={15} /> 提交反馈
          </Button>
        </div>
      </Modal>
    </PageLayout>
  );
}
