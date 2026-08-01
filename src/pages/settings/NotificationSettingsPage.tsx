import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, Smartphone, UsersRound } from 'lucide-react';
import type { ChangeEvent } from 'react';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  settingsApi,
  settingsKeys,
  type NotificationSettingsView,
} from '@/domains/settings';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { Button, Card, Select, Switch, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

export function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: settingsKeys.notifications,
    queryFn: settingsApi.notification,
  });
  const [values, setValues] = useSynchronizedState(
    query.data,
    query.data ?? DEFAULT_NOTIFICATION_SETTINGS,
  );
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: () => settingsApi.updateNotification(values),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.notifications, saved);
      showToast({ tone: 'success', title: '通知设置已保存' });
    },
    onError: () =>
      showToast({ tone: 'error', title: '通知设置保存失败', description: '请稍后重试。' }),
  });

  const update =
    (key: keyof NotificationSettingsView) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.checked }));
    };

  return (
    <SettingsPage title="通知设置" description="分别管理站内、推送、邮件与社群通知。">
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <Bell size={18} />
            </span>
            <div>
              <h2>站内通知</h2>
              <p>控制通知中心显示的互动类型。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="评论与回复"
              description="有人评论你的帖子或回复你的评论"
              checked={values.comments}
              onChange={update('comments')}
            />
            <Switch
              label="点赞"
              description="你的帖子或评论获得点赞"
              checked={values.likes}
              onChange={update('likes')}
            />
            <Switch
              label="新关注与关注请求"
              description="有人关注你或发送关注请求"
              checked={values.follows}
              onChange={update('follows')}
            />
            <Switch
              label="提及"
              description="有人在帖子或评论中提及你"
              checked={values.mentions}
              onChange={update('mentions')}
            />
            <Switch
              label="转发与引用"
              description="你的帖子被转发或引用"
              checked={values.reposts}
              onChange={update('reposts')}
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Smartphone size={18} />
            </span>
            <div>
              <h2>推送与邮件</h2>
              <p>设置离开网站后接收通知的方式。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="浏览器与移动推送"
              description="在支持的设备上显示系统通知"
              checked={values.push}
              onChange={update('push')}
            />
            <Switch
              label="每周邮件摘要"
              description="每周一发送内容、关系和社群摘要"
              checked={values.emailDigest}
              onChange={update('emailDigest')}
            />
          </div>
          <div className={styles.selectGrid} style={{ marginTop: 14 }}>
            <Select label="免打扰时段" defaultValue="23:00 - 08:00">
              <option>23:00 - 08:00</option>
              <option>22:00 - 07:00</option>
              <option>关闭免打扰</option>
            </Select>
            <Select label="邮件摘要频率" defaultValue="每周一次">
              <option>每周一次</option>
              <option>每天一次</option>
              <option>不发送</option>
            </Select>
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <UsersRound size={18} />
            </span>
            <div>
              <h2>社群通知覆盖</h2>
              <p>为特定社群覆盖全局通知设置。</p>
            </div>
          </header>
          <div className={styles.communityOverrides}>
            <article>
              <span>AI</span>
              <div>
                <strong>AI 产品讨论组</strong>
                <p>公告、提及和精选内容</p>
              </div>
              <Select label="通知级别" defaultValue="重要通知">
                <option>重要通知</option>
                <option>全部通知</option>
                <option>静音</option>
              </Select>
            </article>
            <article>
              <span>产</span>
              <div>
                <strong>产品经理交流圈</strong>
                <p>仅提及和管理员公告</p>
              </div>
              <Select label="通知级别" defaultValue="重要通知">
                <option>重要通知</option>
                <option>全部通知</option>
                <option>静音</option>
              </Select>
            </article>
          </div>
        </Card>

        <div className={styles.saveBar}>
          <span>
            <Mail size={16} /> 设置会同步到所有登录设备
          </span>
          <Button
            loading={mutation.isPending}
            disabled={query.isLoading || query.isError}
            onClick={() => mutation.mutate()}
          >
            保存通知设置
          </Button>
        </div>
      </div>
    </SettingsPage>
  );
}
