import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileText, Repeat2, Search, Shield, UserRound } from 'lucide-react';
import { useState } from 'react';
import { permissionKeys, permissionsApi, type PermissionPolicy } from '@/domains/permissions';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { Button, Card, Modal, Select, Switch, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

const postVisibilityLabels: Record<PermissionPolicy['defaultPostVisibility'], string> = {
  PUBLIC: '公开',
  FOLLOWERS: '仅关注者',
  PRIVATE: '仅自己',
  UNLISTED: '不公开列出',
};

const interactionLabels: Record<PermissionPolicy['defaultCommentPermission'], string> = {
  EVERYONE: '所有人',
  FOLLOWING: '我关注的人',
  MUTUALS: '互相关注',
  NO_ONE: '任何人都不允许',
};

const quoteLabels: Record<PermissionPolicy['defaultQuotePermission'], string> = {
  EVERYONE: '所有人',
  FOLLOWING: '我关注的人',
  NO_ONE: '任何人都不允许',
};

const listVisibilityLabels: Record<PermissionPolicy['followerListVisibility'], string> = {
  EVERYONE: '所有人',
  FOLLOWERS: '仅关注者',
  SELF_ONLY: '仅自己',
};

const birthdayVisibilityLabels: Record<PermissionPolicy['birthdayVisibility'], string> = {
  HIDDEN: '隐藏',
  FOLLOWERS: '仅关注者',
  EVERYONE: '所有人',
};

export function PrivacySettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: permissionKeys.currentPolicy,
    queryFn: permissionsApi.get,
  });
  const [policy, setPolicy] = useSynchronizedState<
    PermissionPolicy | undefined,
    PermissionPolicy | null
  >(query.data, query.data ?? null);
  const [previewPolicy, setPreviewPolicy] = useState<PermissionPolicy | null>(null);
  const { showToast } = useToast();

  const previewMutation = useMutation({
    mutationFn: (next: PermissionPolicy) => permissionsApi.preview(next),
    onSuccess: (preview) => setPreviewPolicy(preview),
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '预览失败',
        description: error.message,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (next: PermissionPolicy) => permissionsApi.update(next),
    onSuccess: (savedPolicy) => {
      queryClient.setQueryData(permissionKeys.currentPolicy, savedPolicy);
      void queryClient.invalidateQueries({ queryKey: settingsOverviewKey });
      setPreviewPolicy(null);
      showToast({ tone: 'success', title: '隐私设置已保存' });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '保存失败',
        description: error.message,
      }),
  });

  if (query.isPending || (!policy && !query.isError)) {
    return (
      <SettingsPage title="隐私设置" description="管理服务端保存的账号与内容权限。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="status">
            <Shield size={22} />
            <strong>正在读取隐私策略</strong>
            <p>页面不会在加载期间填入前端默认值。</p>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  if (query.isError || !policy) {
    return (
      <SettingsPage title="隐私设置" description="管理服务端保存的账号与内容权限。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="alert">
            <Shield size={22} />
            <strong>隐私策略加载失败</strong>
            <p>未使用示例数据替代，请恢复服务后重新加载。</p>
            <Button variant="secondary" onClick={() => void query.refetch()}>
              重新加载
            </Button>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  const updatePolicy = <Key extends keyof PermissionPolicy>(
    key: Key,
    value: PermissionPolicy[Key],
  ) => {
    setPolicy((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <SettingsPage
      title="隐私设置"
      description="控制后端支持的账号可见性、内容默认权限与资料展示范围。"
    >
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <UserRound size={18} />
            </span>
            <div>
              <h2>账号可见性</h2>
              <p>以下两项直接对应账号隐私策略。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="设为私密账号"
              description="新关注者需要经过批准"
              checked={policy.accountVisibility === 'PRIVATE'}
              onChange={(event) =>
                updatePolicy('accountVisibility', event.target.checked ? 'PRIVATE' : 'PUBLIC')
              }
            />
            <Switch
              label="允许搜索引擎收录"
              description="允许外部搜索引擎索引公开资料"
              checked={policy.allowSearchIndex}
              onChange={(event) => updatePolicy('allowSearchIndex', event.target.checked)}
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <FileText size={18} />
            </span>
            <div>
              <h2>内容默认权限</h2>
              <p>新内容默认使用这些服务端策略，发布时仍可按后端规则调整。</p>
            </div>
          </header>
          <div className={styles.selectGrid}>
            <Select
              label="帖子可见范围"
              value={policy.defaultPostVisibility}
              onChange={(event) =>
                updatePolicy(
                  'defaultPostVisibility',
                  event.target.value as PermissionPolicy['defaultPostVisibility'],
                )
              }
            >
              {Object.entries(postVisibilityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="评论权限"
              value={policy.defaultCommentPermission}
              onChange={(event) =>
                updatePolicy(
                  'defaultCommentPermission',
                  event.target.value as PermissionPolicy['defaultCommentPermission'],
                )
              }
            >
              {Object.entries(interactionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="点赞权限"
              value={policy.defaultLikePermission}
              onChange={(event) =>
                updatePolicy(
                  'defaultLikePermission',
                  event.target.value as PermissionPolicy['defaultLikePermission'],
                )
              }
            >
              {Object.entries(interactionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="收藏权限"
              value={policy.defaultBookmarkPermission}
              onChange={(event) =>
                updatePolicy(
                  'defaultBookmarkPermission',
                  event.target.value as PermissionPolicy['defaultBookmarkPermission'],
                )
              }
            >
              {Object.entries(interactionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="引用权限"
              value={policy.defaultQuotePermission}
              onChange={(event) =>
                updatePolicy(
                  'defaultQuotePermission',
                  event.target.value as PermissionPolicy['defaultQuotePermission'],
                )
              }
            >
              {Object.entries(quoteLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="转发权限"
              value={policy.defaultRepostPermission}
              onChange={(event) =>
                updatePolicy(
                  'defaultRepostPermission',
                  event.target.value as PermissionPolicy['defaultRepostPermission'],
                )
              }
            >
              {Object.entries(quoteLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="提及权限"
              value={policy.mentionPermission}
              onChange={(event) =>
                updatePolicy(
                  'mentionPermission',
                  event.target.value as PermissionPolicy['mentionPermission'],
                )
              }
            >
              {Object.entries(quoteLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Search size={18} />
            </span>
            <div>
              <h2>资料展示范围</h2>
              <p>关注列表、正在关注列表与生日均使用后端实际字段。</p>
            </div>
          </header>
          <div className={styles.selectGrid}>
            <Select
              label="关注者列表"
              value={policy.followerListVisibility}
              onChange={(event) =>
                updatePolicy(
                  'followerListVisibility',
                  event.target.value as PermissionPolicy['followerListVisibility'],
                )
              }
            >
              {Object.entries(listVisibilityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="正在关注列表"
              value={policy.followingListVisibility}
              onChange={(event) =>
                updatePolicy(
                  'followingListVisibility',
                  event.target.value as PermissionPolicy['followingListVisibility'],
                )
              }
            >
              {Object.entries(listVisibilityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="生日"
              value={policy.birthdayVisibility}
              onChange={(event) =>
                updatePolicy(
                  'birthdayVisibility',
                  event.target.value as PermissionPolicy['birthdayVisibility'],
                )
              }
            >
              {Object.entries(birthdayVisibilityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className={styles.previewBar}>
          <span>
            <Eye size={19} />
          </span>
          <div>
            <strong>保存前由后端预览</strong>
            <p>预览内容使用后端返回的 previewPolicy，不使用本地示例结论。</p>
          </div>
          <Button
            variant="secondary"
            loading={previewMutation.isPending}
            onClick={() => previewMutation.mutate(policy)}
          >
            预览
          </Button>
          <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate(policy)}>
            保存设置
          </Button>
        </Card>
      </div>

      <Modal
        open={Boolean(previewPolicy)}
        title="后端隐私策略预览"
        description="以下内容来自预览接口返回，确认后可保存。"
        onClose={() => setPreviewPolicy(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewPolicy(null)}>
              返回修改
            </Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate(policy)}>
              确认并保存
            </Button>
          </>
        }
      >
        {previewPolicy ? (
          <div className={styles.impact}>
            <div>
              <Shield size={18} />
              <span>
                <strong>
                  账号：{previewPolicy.accountVisibility === 'PRIVATE' ? '私密' : '公开'}
                </strong>
                <p>
                  搜索引擎收录：
                  {previewPolicy.allowSearchIndex ? '允许' : '不允许'}
                </p>
              </span>
            </div>
            <div>
              <FileText size={18} />
              <span>
                <strong>帖子：{postVisibilityLabels[previewPolicy.defaultPostVisibility]}</strong>
                <p>
                  评论 {interactionLabels[previewPolicy.defaultCommentPermission]} · 点赞{' '}
                  {interactionLabels[previewPolicy.defaultLikePermission]} · 收藏{' '}
                  {interactionLabels[previewPolicy.defaultBookmarkPermission]}
                </p>
              </span>
            </div>
            <div>
              <Repeat2 size={18} />
              <span>
                <strong>
                  引用 {quoteLabels[previewPolicy.defaultQuotePermission]} · 转发{' '}
                  {quoteLabels[previewPolicy.defaultRepostPermission]}
                </strong>
                <p>提及 {quoteLabels[previewPolicy.mentionPermission]}</p>
              </span>
            </div>
            <div>
              <UserRound size={18} />
              <span>
                <strong>
                  关注者列表 {listVisibilityLabels[previewPolicy.followerListVisibility]}
                </strong>
                <p>
                  正在关注列表 {listVisibilityLabels[previewPolicy.followingListVisibility]} · 生日{' '}
                  {birthdayVisibilityLabels[previewPolicy.birthdayVisibility]}
                </p>
              </span>
            </div>
          </div>
        ) : null}
      </Modal>
    </SettingsPage>
  );
}

const settingsOverviewKey = ['settings', 'overview'] as const;
