import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock3, Mail, MessageSquareMore, UsersRound } from 'lucide-react';
import type { ChangeEvent } from 'react';
import {
  settingsApi,
  settingsKeys,
  type NotificationSettingsPatch,
  type NotificationSettingsView,
} from '@/domains/settings';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { Button, Card, Select, Switch, TextField, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

type NotificationBooleanField =
  | 'inAppChannelEnabled'
  | 'emailChannelEnabled'
  | 'smsChannelEnabled'
  | 'followNotificationEnabled'
  | 'mentionNotificationEnabled'
  | 'interactionNotificationEnabled'
  | 'communityNotificationEnabled'
  | 'systemNotificationEnabled'
  | 'onlyMutualFollowCanNotify'
  | 'quietHoursEnabled';

function minuteToTime(value: number | null): string {
  if (value === null) return '';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

function timeToMinute(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hoursText, minutesText] = value.split(':');
  if (!hoursText || !minutesText) return null;
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: settingsKeys.notifications,
    queryFn: settingsApi.notification,
  });
  const [values, setValues] = useSynchronizedState<
    NotificationSettingsView | undefined,
    NotificationSettingsView | null
  >(query.data, query.data ?? null);
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: (next: NotificationSettingsPatch) => settingsApi.updateNotification(next),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.notifications, saved);
      void queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
      showToast({ tone: 'success', title: '通知设置已保存' });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '通知设置保存失败',
        description: error.message,
      }),
  });

  const updateBoolean =
    (key: NotificationBooleanField) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => (current ? { ...current, [key]: event.target.checked } : current));
    };

  if (query.isPending || (!values && !query.isError)) {
    return (
      <SettingsPage title="通知设置" description="管理服务端保存的通知渠道与通知类型。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="status">
            <Bell size={22} />
            <strong>正在读取通知设置</strong>
            <p>页面不会在加载期间填入前端默认值。</p>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  if (query.isError || !values) {
    return (
      <SettingsPage title="通知设置" description="管理服务端保存的通知渠道与通知类型。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="alert">
            <Bell size={22} />
            <strong>通知设置加载失败</strong>
            <p>未使用示例数据替代，请恢复服务后重新加载。</p>
            <Button variant="secondary" onClick={() => void query.refetch()}>
              重新加载
            </Button>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  const quietHoursComplete =
    !values.quietHoursEnabled ||
    (values.quietHoursStartMinute !== null &&
      values.quietHoursEndMinute !== null &&
      values.quietHoursTimezone !== null);
  const timezoneOptions = Array.from(
    new Set(
      [values.quietHoursTimezone, 'UTC', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Hong_Kong'].filter(
        (item): item is string => Boolean(item),
      ),
    ),
  );

  return (
    <SettingsPage title="通知设置" description="管理服务端保存的通知渠道、事件类型与免打扰规则。">
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <Mail size={18} />
            </span>
            <div>
              <h2>通知渠道</h2>
              <p>这些开关与后端通知投递渠道一一对应。</p>
            </div>
            <span className={styles.headerBadge}>
              {values.source === 'PERSISTED'
                ? '版本 ' + values.notificationPreferenceVersion
                : '服务端默认'}
            </span>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="站内通知"
              description="在通知中心接收服务端生成的通知"
              checked={values.inAppChannelEnabled}
              onChange={updateBoolean('inAppChannelEnabled')}
            />
            <Switch
              label="邮件通知"
              description="允许通知服务向已绑定邮箱投递"
              checked={values.emailChannelEnabled}
              onChange={updateBoolean('emailChannelEnabled')}
            />
            <Switch
              label="短信通知"
              description="允许通知服务向已绑定手机号投递"
              checked={values.smsChannelEnabled}
              onChange={updateBoolean('smsChannelEnabled')}
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <MessageSquareMore size={18} />
            </span>
            <div>
              <h2>通知类型</h2>
              <p>后端当前按关注、提及、互动、社群和系统五类保存。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="关注通知"
              description="新关注与关注请求"
              checked={values.followNotificationEnabled}
              onChange={updateBoolean('followNotificationEnabled')}
            />
            <Switch
              label="提及通知"
              description="帖子与评论中的提及"
              checked={values.mentionNotificationEnabled}
              onChange={updateBoolean('mentionNotificationEnabled')}
            />
            <Switch
              label="互动通知"
              description="评论、回复、点赞、转发和引用共用此后端开关"
              checked={values.interactionNotificationEnabled}
              onChange={updateBoolean('interactionNotificationEnabled')}
            />
            <Switch
              label="社群通知"
              description="社群内容、公告与相关互动"
              checked={values.communityNotificationEnabled}
              onChange={updateBoolean('communityNotificationEnabled')}
            />
            <Switch
              label="系统通知"
              description="安全与系统状态通知"
              checked={values.systemNotificationEnabled}
              onChange={updateBoolean('systemNotificationEnabled')}
            />
            <Switch
              label="只允许互相关注的人触发通知"
              description="启用后由服务端关系策略过滤通知来源"
              checked={values.onlyMutualFollowCanNotify}
              onChange={updateBoolean('onlyMutualFollowCanNotify')}
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Clock3 size={18} />
            </span>
            <div>
              <h2>免打扰时段</h2>
              <p>时间、时区和启用状态均保存到通知偏好。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="启用免打扰"
              description="在指定时段按服务端策略延后可延迟通知"
              checked={values.quietHoursEnabled}
              onChange={updateBoolean('quietHoursEnabled')}
            />
          </div>
          <div className={styles.selectGrid}>
            <TextField
              label="开始时间"
              type="time"
              value={minuteToTime(values.quietHoursStartMinute)}
              disabled={!values.quietHoursEnabled}
              onChange={(event) =>
                setValues((current) =>
                  current
                    ? { ...current, quietHoursStartMinute: timeToMinute(event.target.value) }
                    : current,
                )
              }
            />
            <TextField
              label="结束时间"
              type="time"
              value={minuteToTime(values.quietHoursEndMinute)}
              disabled={!values.quietHoursEnabled}
              onChange={(event) =>
                setValues((current) =>
                  current
                    ? { ...current, quietHoursEndMinute: timeToMinute(event.target.value) }
                    : current,
                )
              }
            />
            <Select
              label="时区"
              value={values.quietHoursTimezone ?? ''}
              disabled={!values.quietHoursEnabled}
              onChange={(event) =>
                setValues((current) =>
                  current
                    ? { ...current, quietHoursTimezone: event.target.value || null }
                    : current,
                )
              }
            >
              <option value="">请选择时区</option>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </Select>
          </div>
          {!quietHoursComplete ? (
            <p className={styles.hint} role="alert">
              启用免打扰时，开始时间、结束时间和时区都必须填写。
            </p>
          ) : null}
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <UsersRound size={18} />
            </span>
            <div>
              <h2>社群默认通知</h2>
              <p>这里展示后端支持的全局默认模式，不伪造具体社群覆盖记录。</p>
            </div>
          </header>
          <div className={styles.selectGrid}>
            <Select
              label="新帖子"
              value={values.defaultCommunityNewPostMode}
              onChange={(event) =>
                setValues((current) =>
                  current
                    ? {
                        ...current,
                        defaultCommunityNewPostMode: event.target
                          .value as NotificationSettingsView['defaultCommunityNewPostMode'],
                      }
                    : current,
                )
              }
            >
              <option value="ALL">全部</option>
              <option value="HIGHLIGHTS">精选</option>
              <option value="OFF">关闭</option>
            </Select>
            <Select
              label="管理员公告"
              value={values.defaultCommunityAnnouncementMode}
              onChange={(event) =>
                setValues((current) =>
                  current
                    ? {
                        ...current,
                        defaultCommunityAnnouncementMode: event.target
                          .value as NotificationSettingsView['defaultCommunityAnnouncementMode'],
                      }
                    : current,
                )
              }
            >
              <option value="REALTIME">实时</option>
              <option value="OFF">关闭</option>
            </Select>
            <Select
              label="社群互动"
              value={values.defaultCommunityInteractionMode}
              onChange={(event) =>
                setValues((current) =>
                  current
                    ? {
                        ...current,
                        defaultCommunityInteractionMode: event.target
                          .value as NotificationSettingsView['defaultCommunityInteractionMode'],
                      }
                    : current,
                )
              }
            >
              <option value="RELATED_ONLY">仅与我相关</option>
              <option value="OFF">关闭</option>
            </Select>
          </div>
        </Card>

        <div className={styles.saveBar}>
          <span>
            <Bell size={16} /> 保存后以服务端返回的新版本为准
          </span>
          <Button
            loading={mutation.isPending}
            disabled={!quietHoursComplete}
            onClick={() => mutation.mutate(values)}
          >
            保存通知设置
          </Button>
        </div>
      </div>
    </SettingsPage>
  );
}
