import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, MessageCircle, Repeat2, Search, Shield, UserRound } from 'lucide-react';
import { useState } from 'react';
import { permissionKeys, permissionsApi, type PermissionPolicy } from '@/domains/permissions';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { Button, Card, Modal, Select, Switch, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

const initialPolicy: PermissionPolicy = {
  profileVisibility: 'public',
  showOnlineStatus: true,
  showConnections: true,
  discoverByEmail: true,
  discoverByPhone: false,
  searchEngineIndexing: true,
  allowComments: 'everyone',
  allowMentions: 'everyone',
  allowQuotes: 'everyone',
  allowMessages: 'following',
};

const messageLabels: Record<PermissionPolicy['allowMessages'], string> = {
  following: '我关注的人',
  mutual: '互相关注',
  none: '关闭私信',
};

const mentionLabels: Record<PermissionPolicy['allowMentions'], string> = {
  everyone: '所有人',
  following: '我关注的人',
  none: '任何人都不可以',
};

export function PrivacySettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: permissionKeys.currentPolicy,
    queryFn: permissionsApi.get,
  });
  const [policy, setPolicy] = useSynchronizedState(query.data, query.data ?? initialPolicy);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { showToast } = useToast();

  const updatePolicy = <Key extends keyof PermissionPolicy>(
    key: Key,
    value: PermissionPolicy[Key],
  ) => setPolicy((current) => ({ ...current, [key]: value }));

  const previewMutation = useMutation({
    mutationFn: () => permissionsApi.preview(policy),
    onSuccess: () => setPreviewOpen(true),
    onError: () => showToast({ tone: 'error', title: '预览失败', description: '请稍后重试。' }),
  });

  const saveMutation = useMutation({
    mutationFn: () => permissionsApi.update(policy),
    onSuccess: (savedPolicy) => {
      queryClient.setQueryData(permissionKeys.currentPolicy, savedPolicy);
      setPreviewOpen(false);
      showToast({ tone: 'success', title: '隐私设置已保存' });
    },
    onError: () =>
      showToast({ tone: 'error', title: '保存失败', description: '请检查网络后重试。' }),
  });

  return (
    <SettingsPage title="隐私设置" description="控制账号发现方式、资料可见性与默认互动权限。">
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <UserRound size={18} />
            </span>
            <div>
              <h2>账号可见性</h2>
              <p>决定谁可以查看你的完整资料和内容。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="设为私密账号"
              description="新关注者需要你的批准；现有关注者不受影响"
              checked={policy.profileVisibility === 'private'}
              onChange={(event) =>
                updatePolicy('profileVisibility', event.target.checked ? 'private' : 'public')
              }
            />
            <Switch
              label="显示在线状态"
              description="允许你关注的人查看最近在线状态"
              checked={policy.showOnlineStatus}
              onChange={(event) => updatePolicy('showOnlineStatus', event.target.checked)}
            />
            <Switch
              label="显示关注与粉丝列表"
              description="关闭后只有你自己可以查看完整关系列表"
              checked={policy.showConnections}
              onChange={(event) => updatePolicy('showConnections', event.target.checked)}
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Search size={18} />
            </span>
            <div>
              <h2>发现与搜索</h2>
              <p>控制其他人通过哪些信息找到你。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="允许通过邮箱找到我"
              description="邮箱不会被公开显示"
              checked={policy.discoverByEmail}
              onChange={(event) => updatePolicy('discoverByEmail', event.target.checked)}
            />
            <Switch
              label="允许通过手机号找到我"
              description="手机号不会被公开显示"
              checked={policy.discoverByPhone}
              onChange={(event) => updatePolicy('discoverByPhone', event.target.checked)}
            />
            <Switch
              label="允许搜索引擎收录公开资料"
              description="关闭后，外部搜索结果可能需要一段时间更新"
              checked={policy.searchEngineIndexing}
              onChange={(event) => updatePolicy('searchEngineIndexing', event.target.checked)}
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <MessageCircle size={18} />
            </span>
            <div>
              <h2>默认互动权限</h2>
              <p>新发布内容默认使用以下设置，发布时仍可单独调整。</p>
            </div>
          </header>
          <div className={styles.selectGrid}>
            <Select
              label="谁可以评论"
              value={policy.allowComments}
              onChange={(event) =>
                updatePolicy(
                  'allowComments',
                  event.target.value as PermissionPolicy['allowComments'],
                )
              }
            >
              <option value="everyone">所有人</option>
              <option value="following">我关注的人</option>
              <option value="followers">我的关注者</option>
              <option value="none">关闭评论</option>
            </Select>
            <Select
              label="谁可以提及我"
              value={policy.allowMentions}
              onChange={(event) =>
                updatePolicy(
                  'allowMentions',
                  event.target.value as PermissionPolicy['allowMentions'],
                )
              }
            >
              <option value="everyone">所有人</option>
              <option value="following">我关注的人</option>
              <option value="none">任何人都不可以</option>
            </Select>
            <Select
              label="谁可以引用帖子"
              value={policy.allowQuotes}
              onChange={(event) =>
                updatePolicy('allowQuotes', event.target.value as PermissionPolicy['allowQuotes'])
              }
            >
              <option value="everyone">所有人</option>
              <option value="following">我关注的人</option>
              <option value="none">禁止引用</option>
            </Select>
            <Select
              label="谁可以给我发消息"
              value={policy.allowMessages}
              onChange={(event) =>
                updatePolicy(
                  'allowMessages',
                  event.target.value as PermissionPolicy['allowMessages'],
                )
              }
            >
              <option value="following">我关注的人</option>
              <option value="mutual">互相关注</option>
              <option value="none">关闭私信</option>
            </Select>
          </div>
        </Card>

        <Card className={styles.previewBar}>
          <span>
            <Eye size={19} />
          </span>
          <div>
            <strong>保存前预览影响范围</strong>
            <p>查看这些设置会如何影响资料、内容和互动入口。</p>
          </div>
          <Button
            variant="secondary"
            loading={previewMutation.isPending}
            onClick={() => previewMutation.mutate()}
          >
            预览
          </Button>
          <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            保存设置
          </Button>
        </Card>
      </div>

      <Modal
        open={previewOpen}
        title="隐私设置影响预览"
        description="以下变化将在保存后生效。"
        onClose={() => setPreviewOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              返回修改
            </Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              确认并保存
            </Button>
          </>
        }
      >
        <div className={styles.impact}>
          <div>
            <Shield size={18} />
            <span>
              <strong>
                {policy.profileVisibility === 'private' ? '账号将设为私密' : '账号保持公开'}
              </strong>
              <p>
                {policy.profileVisibility === 'private'
                  ? '新关注者需要经过你的批准。'
                  : '所有人可以查看你的公开帖子和基本资料。'}
              </p>
            </span>
          </div>
          <div>
            <MessageCircle size={18} />
            <span>
              <strong>私信权限：{messageLabels[policy.allowMessages]}</strong>
              <p>提及权限：{mentionLabels[policy.allowMentions]}。</p>
            </span>
          </div>
          <div>
            <Repeat2 size={18} />
            <span>
              <strong>
                {policy.searchEngineIndexing ? '允许公开资料被收录' : '不允许搜索引擎收录'}
              </strong>
              <p>
                邮箱发现{policy.discoverByEmail ? '开启' : '关闭'}，手机号发现
                {policy.discoverByPhone ? '开启' : '关闭'}。
              </p>
            </span>
          </div>
        </div>
      </Modal>
    </SettingsPage>
  );
}
