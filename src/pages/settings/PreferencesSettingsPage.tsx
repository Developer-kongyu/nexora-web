import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Globe2, MapPin, Plus, Search, Sparkles } from 'lucide-react';
import {
  settingsApi,
  settingsKeys,
  type RecommendationPreferenceView,
  type SearchPreferenceView,
} from '@/domains/settings';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { cn } from '@/shared/lib/cn';
import { toggleArrayValue } from '@/shared/lib/set';
import { Button, Card, Switch, TextField, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

interface EditablePreferences {
  recommendation: RecommendationPreferenceView;
  search: SearchPreferenceView;
  selectedInterests: string[];
}

function retainSupportedInterests(
  interests: readonly string[],
  supportedCodes: readonly string[],
): string[] {
  const supported = new Set(supportedCodes);
  return interests.filter((interest) => supported.has(interest));
}

export function PreferencesSettingsPage() {
  const queryClient = useQueryClient();
  const recommendationQuery = useQuery({
    queryKey: settingsKeys.recommendation,
    queryFn: settingsApi.recommendation,
  });
  const searchQuery = useQuery({
    queryKey: settingsKeys.search,
    queryFn: settingsApi.search,
  });
  const interestsQuery = useQuery({
    queryKey: settingsKeys.interests,
    queryFn: settingsApi.interests,
  });
  const catalogQuery = useQuery({
    queryKey: settingsKeys.interestCatalog,
    queryFn: settingsApi.interestCatalog,
    staleTime: 5 * 60 * 1000,
  });
  const { showToast } = useToast();

  const enabledTags = catalogQuery.data?.items.filter((item) => item.enabled) ?? [];
  const supportedCodes = enabledTags.map((item) => item.interestTagCode);
  const sourceRevision =
    recommendationQuery.data && searchQuery.data && interestsQuery.data && catalogQuery.data
      ? [
          recommendationQuery.data.recommendationPreferenceVersion,
          searchQuery.data.searchPreferenceVersion,
          catalogQuery.data.dictionaryVersion,
          interestsQuery.data.join(','),
        ].join(':')
      : null;
  const sourceValue: EditablePreferences | null =
    recommendationQuery.data && searchQuery.data && interestsQuery.data && catalogQuery.data
      ? {
          recommendation: recommendationQuery.data,
          search: searchQuery.data,
          selectedInterests: retainSupportedInterests(interestsQuery.data, supportedCodes),
        }
      : null;
  const [values, setValues] = useSynchronizedState(sourceRevision, sourceValue);

  const mutation = useMutation({
    mutationFn: async (next: EditablePreferences) => {
      const recommendation = await settingsApi.updateRecommendation({
        localeCode: next.recommendation.localeCode,
        regionCode: next.recommendation.regionCode,
        allowPersonalizedRecommendation: next.recommendation.allowPersonalizedRecommendation,
        allowCrossLanguageRecommendation: next.recommendation.allowCrossLanguageRecommendation,
        allowCommunityRecommendation: next.recommendation.allowCommunityRecommendation,
      });
      const search = await settingsApi.updateSearch({
        searchHistoryEnabled: next.search.searchHistoryEnabled,
        searchAnalyticsEnabled: next.search.searchAnalyticsEnabled,
        allowSearchTermsForTrending: next.search.allowSearchTermsForTrending,
      });
      const interests = await settingsApi.updateInterests(next.selectedInterests);
      return { recommendation, search, interests };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.recommendation, saved.recommendation);
      queryClient.setQueryData(settingsKeys.search, saved.search);
      queryClient.setQueryData(settingsKeys.interests, saved.interests);
      void queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
      showToast({ tone: 'success', title: '推荐与兴趣设置已保存' });
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.recommendation });
      void queryClient.invalidateQueries({ queryKey: settingsKeys.search });
      void queryClient.invalidateQueries({ queryKey: settingsKeys.interests });
      showToast({
        tone: 'error',
        title: '偏好设置保存失败',
        description: error.message,
      });
    },
  });

  const queries = [recommendationQuery, searchQuery, interestsQuery, catalogQuery] as const;
  const isLoading = queries.some((query) => query.isPending);
  const isError = queries.some((query) => query.isError);

  if (isLoading || (!values && !isError)) {
    return (
      <SettingsPage title="推荐与兴趣" description="管理服务端保存的内容偏好与搜索设置。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="status">
            <Sparkles size={22} />
            <strong>正在读取偏好设置</strong>
            <p>页面不会在加载期间使用前端默认值。</p>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  if (isError || !values) {
    return (
      <SettingsPage title="推荐与兴趣" description="管理服务端保存的内容偏好与搜索设置。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="alert">
            <Sparkles size={22} />
            <strong>偏好设置加载失败</strong>
            <p>未使用示例数据替代，请恢复服务后重新加载。</p>
            <Button
              variant="secondary"
              onClick={() => {
                for (const query of queries) void query.refetch();
              }}
            >
              重新加载
            </Button>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  const updateRecommendation = <Key extends keyof RecommendationPreferenceView>(
    key: Key,
    value: RecommendationPreferenceView[Key],
  ) => {
    setValues((current) =>
      current
        ? {
            ...current,
            recommendation: { ...current.recommendation, [key]: value },
          }
        : current,
    );
  };

  const updateSearch = <Key extends keyof SearchPreferenceView>(
    key: Key,
    value: SearchPreferenceView[Key],
  ) => {
    setValues((current) =>
      current
        ? {
            ...current,
            search: { ...current.search, [key]: value },
          }
        : current,
    );
  };

  const toggleInterest = (interest: string) => {
    setValues((current) =>
      current
        ? {
            ...current,
            selectedInterests: toggleArrayValue(current.selectedInterests, interest),
          }
        : current,
    );
  };

  return (
    <SettingsPage
      title="推荐与兴趣"
      description="调整服务端保存的内容主题、语言地区与个性化推荐方式。"
    >
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <Sparkles size={18} />
            </span>
            <div>
              <h2>兴趣标签</h2>
              <p>标签名称和可用状态来自后端兴趣字典。</p>
            </div>
            <span className={styles.headerBadge}>{values.selectedInterests.length} 个已选择</span>
          </header>
          <div className={styles.interests}>
            {enabledTags.map((interest) => {
              const active = values.selectedInterests.includes(interest.interestTagCode);
              return (
                <button
                  type="button"
                  key={interest.interestTagCode}
                  className={cn(active && styles.interestActive)}
                  aria-pressed={active}
                  onClick={() => toggleInterest(interest.interestTagCode)}
                >
                  {active ? <Check size={14} /> : <Plus size={14} />} {interest.displayName}
                </button>
              );
            })}
          </div>
          {enabledTags.length === 0 ? (
            <p className={styles.hint}>后端当前没有启用的兴趣标签。</p>
          ) : null}
          <p className={styles.hint}>
            字典版本 {catalogQuery.data?.dictionaryVersion}；至少保留 3 个兴趣。
          </p>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Globe2 size={18} />
            </span>
            <div>
              <h2>语言与地区</h2>
              <p>直接编辑后端保存的 localeCode 与 regionCode，不推测所在城市。</p>
            </div>
          </header>
          <div className={styles.selectGrid}>
            <TextField
              label="语言代码"
              name="localeCode"
              placeholder="例如 zh-CN；留空表示未设置"
              value={values.recommendation.localeCode ?? ''}
              onChange={(event) =>
                updateRecommendation('localeCode', event.target.value.trim() || null)
              }
            />
            <TextField
              label="地区代码"
              name="regionCode"
              placeholder="例如 CN；留空表示未设置"
              maxLength={2}
              value={values.recommendation.regionCode ?? ''}
              onChange={(event) =>
                updateRecommendation('regionCode', event.target.value.trim().toUpperCase() || null)
              }
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <Search size={18} />
            </span>
            <div>
              <h2>个性化推荐与搜索</h2>
              <p>每个开关都对应后端已公开的偏好字段。</p>
            </div>
            <span className={styles.headerBadge}>
              推荐 v{values.recommendation.recommendationPreferenceVersion} · 搜索 v
              {values.search.searchPreferenceVersion}
            </span>
          </header>
          <div className={styles.switchList}>
            <Switch
              label="启用个性化推荐"
              description="允许使用账号行为与兴趣改善推荐"
              checked={values.recommendation.allowPersonalizedRecommendation}
              onChange={(event) =>
                updateRecommendation('allowPersonalizedRecommendation', event.target.checked)
              }
            />
            <Switch
              label="允许跨语言推荐"
              description="允许推荐不同语言的相关内容"
              checked={values.recommendation.allowCrossLanguageRecommendation}
              onChange={(event) =>
                updateRecommendation('allowCrossLanguageRecommendation', event.target.checked)
              }
            />
            <Switch
              label="允许社群推荐"
              description="允许推荐系统提供相关社群"
              checked={values.recommendation.allowCommunityRecommendation}
              onChange={(event) =>
                updateRecommendation('allowCommunityRecommendation', event.target.checked)
              }
            />
            <Switch
              label="保存搜索历史"
              description="由后端保存并用于搜索体验"
              checked={values.search.searchHistoryEnabled}
              onChange={(event) => updateSearch('searchHistoryEnabled', event.target.checked)}
            />
            <Switch
              label="允许搜索分析"
              description="允许后端记录搜索分析数据"
              checked={values.search.searchAnalyticsEnabled}
              onChange={(event) => updateSearch('searchAnalyticsEnabled', event.target.checked)}
            />
            <Switch
              label="允许搜索词用于趋势"
              description="允许聚合搜索词用于趋势计算"
              checked={values.search.allowSearchTermsForTrending}
              onChange={(event) =>
                updateSearch('allowSearchTermsForTrending', event.target.checked)
              }
            />
          </div>
        </Card>

        <div className={styles.saveBar}>
          <span>
            <MapPin size={16} /> 保存结果以三个后端接口返回的数据为准
          </span>
          <Button
            loading={mutation.isPending}
            disabled={values.selectedInterests.length < 3}
            onClick={() => mutation.mutate(values)}
          >
            保存偏好
          </Button>
        </div>
      </div>
    </SettingsPage>
  );
}
