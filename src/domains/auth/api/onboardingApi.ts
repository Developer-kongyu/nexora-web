import { apiClient } from '@/shared/api/client';
import { createIdempotencyKey } from '@/shared/api/idempotency';
import type { AuthOnboardingStatus } from '../model/types';

export type OnboardingStepId =
  'handle' | 'interests' | 'recommended-users' | 'recommended-communities' | 'complete';
export type OnboardingSubmitMode = 'SNAPSHOT' | 'LIVE_TOKEN' | 'FINAL_EMPTY_CONFIRM' | 'NONE';

export interface OnboardingStatusView {
  userId: string;
  onboardingStatus: AuthOnboardingStatus;
  completedSteps: OnboardingStepId[];
  selectedInterestTagCodes: string[];
  recommendedUserIds: string[];
  recommendedCommunityIds: string[];
  lastStep: OnboardingStepId | null;
  nextStep: OnboardingStepId | null;
  recommendationSnapshotVersion: number | null;
  recommendationSnapshotPayloadHash: string | null;
}

interface RecommendationBinding {
  snapshotVersion: number | null;
  snapshotPayloadHash: string | null;
  submitMode: OnboardingSubmitMode;
  sourceSubmitToken: string | null;
  submittable: boolean;
}

export interface RecommendedUsersView extends RecommendationBinding {
  list: Array<{
    userId: string;
    score: number | null;
    reasonCode: string | null;
    card: {
      userId: string;
      handle: string;
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      followersCount: number;
    };
  }>;
}

export interface RecommendedCommunitiesView extends RecommendationBinding {
  list: Array<{
    communityId: string;
    score: number | null;
    reasonCode: string | null;
    card: {
      communityId: string;
      slug: string;
      displayName: string;
      avatarUrl: string | null;
      memberCount: number;
      description: string | null;
    };
    membership: { joined: boolean; pending: boolean };
  }>;
}

export interface OnboardingSubmitResult {
  retryRequired: boolean;
  completedSteps: OnboardingStepId[];
  lastStep: OnboardingStepId;
  nextStep: 'recommended-users' | 'recommended-communities' | 'complete';
}

function userSubmitBody(view: RecommendedUsersView, selectedUserIds: string[]) {
  if (!view.submittable || view.submitMode === 'NONE') throw new Error('当前推荐结果不可提交');
  if (view.submitMode === 'FINAL_EMPTY_CONFIRM') {
    return {
      selectedUserIds: [] as string[],
      submitMode: view.submitMode,
      sourceSnapshotVersion: view.snapshotVersion!,
      sourceSnapshotPayloadHash: view.snapshotPayloadHash!,
      sourceSubmitToken: null,
    };
  }
  return {
    selectedUserIds,
    submitMode: view.submitMode,
    sourceSnapshotVersion: view.submitMode === 'SNAPSHOT' ? view.snapshotVersion : null,
    sourceSnapshotPayloadHash: view.submitMode === 'SNAPSHOT' ? view.snapshotPayloadHash : null,
    sourceSubmitToken: view.sourceSubmitToken!,
  };
}

function communitySubmitBody(view: RecommendedCommunitiesView, selectedCommunityIds: string[]) {
  if (
    !view.submittable ||
    view.submitMode === 'NONE' ||
    view.submitMode === 'FINAL_EMPTY_CONFIRM'
  ) {
    throw new Error('当前推荐结果不可提交');
  }
  return {
    selectedCommunityIds,
    submitMode: view.submitMode,
    sourceSnapshotVersion: view.submitMode === 'SNAPSHOT' ? view.snapshotVersion : null,
    sourceSnapshotPayloadHash: view.submitMode === 'SNAPSHOT' ? view.snapshotPayloadHash : null,
    sourceSubmitToken: view.sourceSubmitToken!,
  };
}

export const onboardingApi = {
  status: () => apiClient.request<OnboardingStatusView>({ path: '/api/auth/onboarding/status' }),
  saveInterests: (interestTagCodes: string[]) =>
    apiClient.request<unknown, { interestTagCodes: string[]; source: 'ONBOARDING_PAGE' }>({
      method: 'POST',
      path: '/api/auth/onboarding/interests',
      body: { interestTagCodes, source: 'ONBOARDING_PAGE' },
      idempotencyKey: createIdempotencyKey('onboarding-interests'),
    }),
  recommendedUsers: () =>
    apiClient.request<RecommendedUsersView>({
      path: '/api/auth/onboarding/recommendations/users?limit=20',
    }),
  submitUsers: (view: RecommendedUsersView, selectedUserIds: string[]) =>
    apiClient.request<OnboardingSubmitResult, ReturnType<typeof userSubmitBody>>({
      method: 'POST',
      path: '/api/auth/onboarding/recommendations/users',
      body: userSubmitBody(view, selectedUserIds),
      idempotencyKey: createIdempotencyKey('onboarding-users'),
    }),
  recommendedCommunities: () =>
    apiClient.request<RecommendedCommunitiesView>({
      path: '/api/auth/onboarding/recommendations/communities?limit=20',
    }),
  submitCommunities: (view: RecommendedCommunitiesView, selectedCommunityIds: string[]) =>
    apiClient.request<OnboardingSubmitResult, ReturnType<typeof communitySubmitBody>>({
      method: 'POST',
      path: '/api/auth/onboarding/recommendations/communities',
      body: communitySubmitBody(view, selectedCommunityIds),
      idempotencyKey: createIdempotencyKey('onboarding-communities'),
    }),
  complete: () =>
    apiClient.request<{ onboardingStatus: 'COMPLETED' }, Record<string, never>>({
      method: 'POST',
      path: '/api/auth/onboarding/complete',
      body: {},
    }),
  skip: () =>
    apiClient.request<{ onboardingStatus: 'SKIPPED' }, Record<string, never>>({
      method: 'POST',
      path: '/api/auth/onboarding/skip',
      body: {},
    }),
};
