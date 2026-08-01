import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useState } from 'react';
import {
  COMMUNITY_COMMENT_ROLE_MIN_OPTIONS,
  COMMUNITY_JOIN_POLICY_OPTIONS,
  COMMUNITY_POST_ROLE_MIN_OPTIONS,
  COMMUNITY_VISIBILITY_OPTIONS,
  communitiesApi,
  communityManageKeys,
  type CommunityCommentRole,
  type CommunityDetailView,
  type CommunityJoinPolicy,
  type CommunityPostRole,
  type CommunityVisibility,
  type UpdateCommunitySettingsInput,
} from '@/domains/communities';
import { Badge, Button, Card, Select, SelectOptions, Switch, useToast } from '@/shared/ui';
import { Notice } from '@/pages/_shared/PageParts';
import { type CommunityManageDetailSectionProps } from '../communityManage.model';
import styles from '../CommunityManagePage.module.css';

function settingsFromDetail(detail: CommunityDetailView): Required<UpdateCommunitySettingsInput> {
  const community = detail.community;
  return {
    visibility: community.visibility,
    joinPolicy: community.joinPolicy,
    postRoleMin: community.postRoleMin,
    commentRoleMin: community.commentRoleMin,
    quoteEnabled: community.quoteEnabled,
    repostEnabled: community.repostEnabled,
    requireRuleAcceptanceBeforePost: community.requireRuleAcceptanceBeforePost,
  };
}

export function SettingsSection({ communityId, detail }: CommunityManageDetailSectionProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const baseline = settingsFromDetail(detail);
  const [settings, setSettings] = useState(() => settingsFromDetail(detail));

  const isDirty = JSON.stringify(settings) !== JSON.stringify(baseline);

  const save = useMutation({
    mutationFn: () => communitiesApi.updateSettings(communityId, settings),
    onSuccess: (result) => {
      showToast({
        tone: 'success',
        title: '社群权限设置已保存',
        description: `设置版本已更新为 ${result.settingsVersion}。`,
      });
      void queryClient.invalidateQueries({ queryKey: communityManageKeys.root(communityId) });
    },
    onError: () =>
      showToast({
        tone: 'error',
        title: '设置保存失败',
        description: '请检查当前管理权限与字段取值。',
      }),
  });

  return (
    <div className={styles.stack}>
      <Notice>
        本区只提交后端正式的 settings patch；社群名称、Slug、简介与媒体资料不会混入该请求。
      </Notice>
      <Card className={styles.panel}>
        <header>
          <div>
            <h2>权限与加入设置</h2>
            <p>
              {detail.community.name} · /{detail.community.slug}
            </p>
          </div>
          <Badge tone="brand">版本 {detail.community.settingsVersion}</Badge>
        </header>
        <div className={styles.formSection}>
          <div className={styles.settingGrid}>
            <Select
              label="社群可见性"
              value={settings.visibility}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  visibility: event.target.value as CommunityVisibility,
                }))
              }
            >
              <SelectOptions options={COMMUNITY_VISIBILITY_OPTIONS} />
            </Select>
            <Select
              label="加入方式"
              value={settings.joinPolicy}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  joinPolicy: event.target.value as CommunityJoinPolicy,
                }))
              }
            >
              <SelectOptions options={COMMUNITY_JOIN_POLICY_OPTIONS} />
            </Select>
            <Select
              label="最低发帖角色"
              value={settings.postRoleMin}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  postRoleMin: event.target.value as CommunityPostRole,
                }))
              }
            >
              <SelectOptions options={COMMUNITY_POST_ROLE_MIN_OPTIONS} />
            </Select>
            <Select
              label="最低评论角色"
              value={settings.commentRoleMin}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  commentRoleMin: event.target.value as CommunityCommentRole,
                }))
              }
            >
              <SelectOptions options={COMMUNITY_COMMENT_ROLE_MIN_OPTIONS} />
            </Select>
          </div>

          <div className={styles.switchGrid}>
            <Switch
              label="允许引用帖子"
              description="成员可创建引用帖"
              checked={settings.quoteEnabled}
              onChange={(event) =>
                setSettings((current) => ({ ...current, quoteEnabled: event.target.checked }))
              }
            />
            <Switch
              label="允许转发帖子"
              description="成员可转发社群帖子"
              checked={settings.repostEnabled}
              onChange={(event) =>
                setSettings((current) => ({ ...current, repostEnabled: event.target.checked }))
              }
            />
            <Switch
              label="发帖前必须确认规则"
              description="成员需接受当前规则版本后才能发帖"
              checked={settings.requireRuleAcceptanceBeforePost}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  requireRuleAcceptanceBeforePost: event.target.checked,
                }))
              }
            />
          </div>

          <div className={styles.inlineActions}>
            <Button
              variant="secondary"
              disabled={!isDirty || save.isPending}
              onClick={() => setSettings(baseline)}
            >
              放弃修改
            </Button>
            <Button loading={save.isPending} disabled={!isDirty} onClick={() => save.mutate()}>
              <Save size={15} /> 保存权限设置
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
