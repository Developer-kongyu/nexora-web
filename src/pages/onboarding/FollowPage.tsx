import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  onboardingApi,
  onboardingKeys,
  shouldRefreshOnboardingRecommendation,
  useAuthStore,
} from '@/domains/auth';
import { OnboardingSelection, type OnboardingOption } from './OnboardingSelection';

export function FollowPage() {
  const query = useQuery({
    queryKey: onboardingKeys.recommendedUsers,
    queryFn: onboardingApi.recommendedUsers,
    refetchInterval: (current) => (current.state.data?.submittable === false ? 2_000 : false),
  });
  const options = useMemo<OnboardingOption[]>(
    () =>
      query.data?.list.map(({ card, reasonCode }) => ({
        id: card.userId,
        title: card.displayName,
        description: `@${card.handle}${card.bio ? ` · ${card.bio}` : ''}`,
        meta: `${card.followersCount.toLocaleString()} 位关注者${reasonCode ? ` · ${reasonCode}` : ''}`,
        tone: 'cyan',
        initials: card.displayName.slice(0, 1),
      })) ?? [],
    [query.data],
  );

  const submit = async (selected: string[]) => {
    if (!query.data) throw new Error('推荐结果尚未加载');
    let result;
    try {
      result = await onboardingApi.submitUsers(query.data, selected);
    } catch (error) {
      if (!shouldRefreshOnboardingRecommendation(error)) throw error;
      const refreshed = await query.refetch();
      if (refreshed.isError || !refreshed.data?.submittable) {
        throw new Error('推荐列表正在更新，请稍后再点击下一步');
      }
      const currentIds = new Set(refreshed.data.list.map((item) => item.card.userId));
      try {
        result = await onboardingApi.submitUsers(
          refreshed.data,
          selected.filter((userId) => currentIds.has(userId)),
        );
      } catch (retryError) {
        if (shouldRefreshOnboardingRecommendation(retryError)) {
          throw new Error('推荐列表正在更新，请稍后再点击下一步');
        }
        throw retryError;
      }
    }
    if (result.retryRequired) throw new Error('部分关注操作失败，请重试后再继续');
    useAuthStore.setState({ onboardingStatus: 'PENDING_RECOMMENDED_COMMUNITIES' });
  };

  const skip = async () => {
    if (query.data?.submittable) {
      await submit([]);
      return;
    }
    const result = await onboardingApi.skip();
    useAuthStore.setState({
      onboardingCompleted: true,
      onboardingStatus: result.onboardingStatus,
    });
  };

  return (
    <OnboardingSelection
      key={query.data?.snapshotVersion ?? 'loading'}
      kind="user"
      title="关注一些优质创作者"
      options={options}
      nextPath="/onboarding/communities"
      skipPath={query.data?.submittable ? undefined : '/home'}
      loading={query.isLoading}
      error={query.error?.message ?? null}
      onSubmit={submit}
      onSkip={skip}
    />
  );
}
