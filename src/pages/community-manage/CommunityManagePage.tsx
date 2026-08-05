import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  communitiesApi,
  communityManageKeys,
  type CommunityDetailView,
} from '@/domains/communities';
import { paths } from '@/shared/config/paths';
import { Button, Card } from '@/shared/ui';
import { EmptyPanel, LoadingRows, PageTitle } from '@/pages/_shared/PageParts';
import { CommunityManageSidebar } from './CommunityManageSidebar';
import {
  getCommunityManageAccess,
  isCommunityManageSection,
  type CommunityManageAccess,
  type CommunityManageSection,
} from './communityManage.model';
import { JoinRequestsSection } from './sections/JoinRequestsSection';
import { LogsSection } from './sections/LogsSection';
import { MembersSection } from './sections/MembersSection';
import { OverviewSection } from './sections/OverviewSection';
import { PinnedPostsSection } from './sections/PinnedPostsSection';
import { RulesSection } from './sections/RulesSection';
import { SettingsSection } from './sections/SettingsSection';
import styles from './CommunityManagePage.module.css';

function renderSection(
  active: CommunityManageSection,
  communityId: string,
  detail: CommunityDetailView,
  access: CommunityManageAccess,
  onNavigate: (section: CommunityManageSection) => void,
) {
  switch (active) {
    case 'overview':
      return <OverviewSection communityId={communityId} onNavigate={onNavigate} />;
    case 'requests':
      return <JoinRequestsSection communityId={communityId} />;
    case 'members':
      return (
        <MembersSection
          communityId={communityId}
          canChangeMemberRoles={access.canChangeMemberRoles}
          canRemoveMembers={access.canRemoveMembers}
        />
      );
    case 'pinned':
      return <PinnedPostsSection communityId={communityId} />;
    case 'rules':
      return (
        <RulesSection
          key={`${communityId}:${detail.community.rulesVersion}`}
          communityId={communityId}
          detail={detail}
        />
      );
    case 'logs':
      return <LogsSection communityId={communityId} />;
    case 'settings':
      return (
        <SettingsSection
          key={`${communityId}:${detail.community.settingsVersion}`}
          communityId={communityId}
          detail={detail}
        />
      );
  }
}

export function CommunityManagePage() {
  const params = useParams();
  const navigate = useNavigate();
  const communityId = params.communityId ?? '';
  const requestedSection: CommunityManageSection = isCommunityManageSection(params.section)
    ? params.section
    : 'overview';

  const detail = useQuery({
    queryKey: communityManageKeys.detail(communityId),
    queryFn: ({ signal }) => communitiesApi.getDetailById(communityId, signal),
    enabled: Boolean(communityId),
  });
  const overview = useQuery({
    queryKey: communityManageKeys.overview(communityId, 7),
    queryFn: ({ signal }) => communitiesApi.managementOverview(communityId, 7, signal),
    enabled: Boolean(communityId && detail.data?.viewerContext?.canManageCommunity),
  });

  const switchSection = (section: CommunityManageSection) => {
    void navigate(paths.communityManageSection(communityId, section));
  };

  if (!communityId) {
    return (
      <Card>
        <EmptyPanel
          icon={<ShieldAlert size={30} />}
          title="缺少社群标识"
          description="无法打开社群管理台。"
          action={<Button onClick={() => navigate(paths.communities)}>返回社群列表</Button>}
        />
      </Card>
    );
  }

  if (detail.isLoading) {
    return (
      <>
        <PageTitle title="社群管理台" description="正在读取社群权限与管理资料。" />
        <LoadingRows count={5} />
      </>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <>
        <PageTitle title="社群管理台" description="社群资料读取失败。" />
        <Card>
          <EmptyPanel
            title="无法加载管理台"
            description="请确认社群存在且网络正常。"
            action={<Button onClick={() => void detail.refetch()}>重新加载</Button>}
          />
        </Card>
      </>
    );
  }

  const detailData = detail.data;
  const context = detailData.viewerContext;

  if (!context?.canManageCommunity) {
    return (
      <>
        <PageTitle title={`${detailData.community.name} · 管理台`} />
        <Card>
          <EmptyPanel
            icon={<ShieldAlert size={30} />}
            title="没有管理权限"
            description="只有后端判定为版主、管理员或所有者的当前有效成员可以进入管理台。"
            action={
              <Button onClick={() => navigate(paths.community(detailData.community.slug))}>
                返回社群
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const access = getCommunityManageAccess(detailData);
  if (!access.sections.includes(requestedSection)) {
    return (
      <Navigate
        to={paths.communityManageSection(communityId, access.sections[0] ?? 'overview')}
        replace
      />
    );
  }

  const community = detailData.community;

  return (
    <>
      <PageTitle
        title={`${community.name} · 管理台`}
        description="管理加入申请、成员角色、社群规则、置顶内容、权限设置与审计日志。"
        actions={
          <Button variant="secondary" onClick={() => navigate(paths.community(community.slug))}>
            <ArrowLeft size={15} /> 返回社群
          </Button>
        }
      />
      <div className={styles.layout}>
        <CommunityManageSidebar
          detail={detailData}
          active={requestedSection}
          availableSections={access.sections}
          pendingRequestCount={overview.data?.snapshot.pendingJoinRequestCount ?? 0}
          onSelect={switchSection}
        />
        <main>
          {renderSection(requestedSection, communityId, detailData, access, switchSection)}
        </main>
      </div>
    </>
  );
}
