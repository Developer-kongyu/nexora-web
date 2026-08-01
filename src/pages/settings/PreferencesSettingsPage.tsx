import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Globe2, MapPin, Plus, Search, Sparkles } from 'lucide-react';
import { RECOMMENDATION_INTEREST_OPTIONS, settingsApi, settingsKeys } from '@/domains/settings';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { cn } from '@/shared/lib/cn';
import { toggleArrayValue } from '@/shared/lib/set';
import { Button, Card, Select, Switch, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

function retainSupportedInterests(interests: readonly string[] | undefined): string[] {
  if (!interests) return [];
  const supported = new Set<string>(RECOMMENDATION_INTEREST_OPTIONS);
  return interests.filter((interest) => supported.has(interest));
}

export function PreferencesSettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: settingsKeys.interests,
    queryFn: settingsApi.interests,
  });
  const [selected, setSelected] = useSynchronizedState(
    query.data,
    retainSupportedInterests(query.data),
  );
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: () => settingsApi.updateInterests(selected),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.interests, saved);
      showToast({ tone: 'success', title: '推荐偏好已保存' });
    },
    onError: () =>
      showToast({ tone: 'error', title: '推荐偏好保存失败', description: '请稍后重试。' }),
  });

  const toggleInterest = (interest: string) => {
    setSelected((current) => toggleArrayValue(current, interest));
  };

  return (
    <SettingsPage title="推荐与兴趣" description="调整内容主题、语言地区和个性化推荐方式。">
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <Sparkles size={18} />
            </span>
            <div>
              <h2>兴趣标签</h2>
              <p>用于首页推荐、发现页排序和社群推荐。</p>
            </div>
            <span className={styles.headerBadge}>{selected.length} 个已选择</span>
          </header>
          <div className={styles.interests}>
            {RECOMMENDATION_INTEREST_OPTIONS.map((interest) => {
              const active = selected.includes(interest);
              return (
                <button
                  type="button"
                  key={interest}
                  className={cn(active && styles.interestActive)}
                  aria-pressed={active}
                  onClick={() => toggleInterest(interest)}
                >
                  {active ? <Check size={14} /> : <Plus size={14} />} {interest}
                </button>
              );
            })}
          </div>
          <p className={styles.hint}>至少保留 3 个兴趣，以获得更稳定的推荐结果。</p>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Globe2 size={18} />
            </span>
            <div>
              <h2>语言与地区</h2>
              <p>影响趋势、社群和本地内容的优先级。</p>
            </div>
          </header>
          <div className={styles.selectGrid}>
            <Select label="内容语言" defaultValue="简体中文">
              <option>简体中文</option>
              <option>简体中文 + English</option>
              <option>不限语言</option>
            </Select>
            <Select label="所在地区" defaultValue="中国 · 台湾">
              <option>中国 · 上海</option>
              <option>中国 · 台湾</option>
              <option>不限地区</option>
            </Select>
            <Select label="时区" defaultValue="Asia/Taipei (UTC+8)">
              <option>Asia/Taipei (UTC+8)</option>
              <option>Asia/Shanghai (UTC+8)</option>
            </Select>
            <Select label="日期与数字格式" defaultValue="中文格式">
              <option>中文格式</option>
              <option>国际格式</option>
            </Select>
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Search size={18} />
            </span>
            <div>
              <h2>个性化推荐与搜索</h2>
              <p>决定推荐系统可使用哪些行为信号。</p>
            </div>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="启用个性化推荐"
              description="使用关注、互动和兴趣标签改进内容排序"
              defaultChecked
            />
            <Switch
              label="使用浏览历史优化推荐"
              description="可随时在浏览历史中清理记录"
              defaultChecked
            />
            <Switch
              label="个性化搜索排序"
              description="根据兴趣和关系优先展示相关结果"
              defaultChecked
            />
            <Switch
              label="推荐本地活动和社群"
              description="使用地区信息展示附近内容"
              defaultChecked
            />
          </div>
        </Card>

        <div className={styles.saveBar}>
          <span>
            <MapPin size={16} /> 推荐模型可能需要一段时间适应新的偏好
          </span>
          <Button
            loading={mutation.isPending}
            disabled={query.isLoading || query.isError || selected.length < 3}
            onClick={() => mutation.mutate()}
          >
            保存偏好
          </Button>
        </div>
      </div>
    </SettingsPage>
  );
}
