import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  onboardingApi,
  onboardingKeys,
  shouldRefreshOnboardingRecommendation,
  useAuthStore,
} from '@/domains/auth';
import { OnboardingSelection, type OnboardingOption } from './OnboardingSelection';

export function CommunitiesPage() {
  const query = useQuery({
    queryKey: onboardingKeys.recommendedCommunities,
    queryFn: onboardingApi.recommendedCommunities,
  });
  const options = useMemo<OnboardingOption[]>(
    () =>
      query.data?.list.map(({ card, membership }) => ({
        id: card.communityId,
        title: card.displayName,
        description: card.description ?? `/${card.slug}`,
        meta: `${card.memberCount.toLocaleString()} 位成员${membership.joined ? ' · 已加入' : membership.pending ? ' · 审核中' : ''}`,
        tone: 'purple',
        initials: card.displayName.slice(0, 2),
      })) ?? [],
    [query.data],
  );

  const submit = async (selected: string[]) => {
    if (!query.data) throw new Error('推荐结果尚未加载');
    if (query.data.submittable) {
      let result;
      try {
        result = await onboardingApi.submitCommunities(query.data, selected);
      } catch (error) {
        if (!shouldRefreshOnboardingRecommendation(error)) throw error;
        const refreshed = await query.refetch();
        if (refreshed.isError || !refreshed.data?.submittable) {
          throw new Error('社区推荐正在更新，请稍后再试');
        }
        const currentIds = new Set(refreshed.data.list.map((item) => item.card.communityId));
        try {
          result = await onboardingApi.submitCommunities(
            refreshed.data,
            selected.filter((communityId) => currentIds.has(communityId)),
          );
        } catch (retryError) {
          if (shouldRefreshOnboardingRecommendation(retryError)) {
            throw new Error('社区推荐正在更新，请稍后再试');
          }
          throw retryError;
        }
      }
      if (result.retryRequired) throw new Error('部分入群操作失败，请重试后再继续');
    }
    await onboardingApi.complete();
    useAuthStore.setState({ onboardingCompleted: true, onboardingStatus: 'COMPLETED' });
  };

  return (
    <OnboardingSelection
      key={query.data?.snapshotVersion ?? 'loading'}
      kind="community"
      title="加入推荐社区"
      description="候选社区与成员状态来自后端当前推荐快照。"
      options={options}
      nextPath="/home"
      final
      loading={query.isLoading}
      error={query.error?.message ?? null}
      onSubmit={submit}
      onSkip={() => submit([])}
    />
  );
}
