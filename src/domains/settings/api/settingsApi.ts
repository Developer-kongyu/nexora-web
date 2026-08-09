import { apiClient } from '@/shared/api/client';
import type {
  InterestTagCatalogView,
  NotificationSettingsPatch,
  NotificationSettingsView,
  RecommendationPreferencePatch,
  RecommendationPreferenceView,
  SearchPreferencePatch,
  SearchPreferenceView,
} from '../model/types';

export interface SettingsOverview {
  profile: {
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    bio: string | null;
    location: string | null;
    websiteUrl: string | null;
    updatedAt: string;
  };
  account: {
    status: 'ACTIVE';
    activeSessionCount: number;
  };
  privacy: {
    accountVisibility: 'PUBLIC' | 'PRIVATE';
    allowSearchIndex: boolean;
    defaultPostVisibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE' | 'UNLISTED';
    defaultCommentPermission: 'EVERYONE' | 'FOLLOWING' | 'MUTUALS' | 'NO_ONE';
    defaultQuotePermission: 'EVERYONE' | 'FOLLOWING' | 'NO_ONE';
    mentionPermission: 'EVERYONE' | 'FOLLOWING' | 'NO_ONE';
  };
  notification: Pick<
    NotificationSettingsView,
    | 'userId'
    | 'rowExists'
    | 'source'
    | 'inAppChannelEnabled'
    | 'emailChannelEnabled'
    | 'smsChannelEnabled'
    | 'communityNotificationEnabled'
    | 'quietHoursEnabled'
    | 'notificationPreferenceVersion'
  >;
  search: SearchPreferenceView;
  recommendation: Omit<RecommendationPreferenceView, 'interestTagCodes'> & {
    interestTagCount: number;
  };
}

interface BackendInterestList {
  list: Array<{ interestTagCode: string }>;
}

function toNotificationPatch(value: NotificationSettingsPatch): NotificationSettingsPatch {
  return {
    inAppChannelEnabled: value.inAppChannelEnabled,
    emailChannelEnabled: value.emailChannelEnabled,
    smsChannelEnabled: value.smsChannelEnabled,
    followNotificationEnabled: value.followNotificationEnabled,
    mentionNotificationEnabled: value.mentionNotificationEnabled,
    interactionNotificationEnabled: value.interactionNotificationEnabled,
    communityNotificationEnabled: value.communityNotificationEnabled,
    systemNotificationEnabled: value.systemNotificationEnabled,
    onlyMutualFollowCanNotify: value.onlyMutualFollowCanNotify,
    quietHoursEnabled: value.quietHoursEnabled,
    quietHoursStartMinute: value.quietHoursStartMinute,
    quietHoursEndMinute: value.quietHoursEndMinute,
    quietHoursTimezone: value.quietHoursTimezone,
    defaultCommunityNewPostMode: value.defaultCommunityNewPostMode,
    defaultCommunityAnnouncementMode: value.defaultCommunityAnnouncementMode,
    defaultCommunityInteractionMode: value.defaultCommunityInteractionMode,
  };
}

export const settingsApi = {
  overview: () => apiClient.request<SettingsOverview>({ path: '/api/settings/overview' }),
  notification: () =>
    apiClient.request<NotificationSettingsView>({ path: '/api/settings/notifications' }),
  updateNotification: (body: NotificationSettingsPatch) =>
    apiClient.request<NotificationSettingsView, NotificationSettingsPatch>({
      method: 'PATCH',
      path: '/api/settings/notifications',
      body: toNotificationPatch(body),
    }),
  recommendation: () =>
    apiClient.request<RecommendationPreferenceView>({ path: '/api/settings/recommendation' }),
  updateRecommendation: (body: RecommendationPreferencePatch) =>
    apiClient.request<RecommendationPreferenceView, RecommendationPreferencePatch>({
      method: 'PATCH',
      path: '/api/settings/recommendation',
      body,
    }),
  search: () => apiClient.request<SearchPreferenceView>({ path: '/api/settings/search' }),
  updateSearch: (body: SearchPreferencePatch) =>
    apiClient.request<SearchPreferenceView, SearchPreferencePatch>({
      method: 'PATCH',
      path: '/api/settings/search',
      body,
    }),
  interestCatalog: () =>
    apiClient.request<InterestTagCatalogView>({ path: '/api/settings/interests/catalog' }),
  interests: async () => {
    const value = await apiClient.request<BackendInterestList>({
      path: '/api/settings/interests',
    });
    return value.list.map((item) => item.interestTagCode);
  },
  updateInterests: async (interests: string[]) => {
    const value = await apiClient.request<
      BackendInterestList,
      { items: Array<{ interestTagCode: string }> }
    >({
      method: 'PUT',
      path: '/api/settings/interests',
      body: { items: interests.map((interestTagCode) => ({ interestTagCode })) },
    });
    return value.list.map((item) => item.interestTagCode);
  },
};
