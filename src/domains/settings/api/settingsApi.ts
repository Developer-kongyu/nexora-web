import { apiClient } from '@/shared/api/client';
import type { AccountVisibility } from '@/domains/permissions';
import type { InterestTagCatalogView, NotificationSettingsView } from '../model/types';

export interface SettingsOverview {
  notificationEnabled: boolean;
  privateAccount: boolean;
  recommendationEnabled: boolean;
  interests: string[];
}

interface BackendNotificationSettings {
  inAppChannelEnabled: boolean;
  emailChannelEnabled: boolean;
  smsChannelEnabled: boolean;
  followNotificationEnabled: boolean;
  mentionNotificationEnabled: boolean;
  interactionNotificationEnabled: boolean;
  communityNotificationEnabled: boolean;
  systemNotificationEnabled: boolean;
  onlyMutualFollowCanNotify: boolean;
  quietHoursEnabled: boolean;
  quietHoursStartMinute: number | null;
  quietHoursEndMinute: number | null;
  quietHoursTimezone: string | null;
  defaultCommunityNewPostMode: 'ALL' | 'HIGHLIGHTS' | 'OFF';
  defaultCommunityAnnouncementMode: 'REALTIME' | 'OFF';
  defaultCommunityInteractionMode: 'RELATED_ONLY' | 'OFF';
}

interface BackendInterestList {
  list: Array<{ interestTagCode: string }>;
}

function notificationToView(value: BackendNotificationSettings): NotificationSettingsView {
  return {
    comments: value.interactionNotificationEnabled,
    likes: value.interactionNotificationEnabled,
    reposts: value.interactionNotificationEnabled,
    follows: value.followNotificationEnabled,
    communities: value.communityNotificationEnabled,
    mentions: value.mentionNotificationEnabled,
    emailDigest: value.emailChannelEnabled,
    push: value.inAppChannelEnabled,
  };
}

function notificationToPatch(value: NotificationSettingsView) {
  return {
    inAppChannelEnabled: value.push,
    emailChannelEnabled: value.emailDigest,
    followNotificationEnabled: value.follows,
    mentionNotificationEnabled: value.mentions,
    interactionNotificationEnabled: value.comments || value.likes || value.reposts,
    communityNotificationEnabled: value.communities,
  };
}

export const settingsApi = {
  overview: async (): Promise<SettingsOverview> => {
    const value = await apiClient.request<{
      privacy: { accountVisibility: AccountVisibility };
      notification: { inAppChannelEnabled: boolean };
      recommendation: { allowPersonalizedRecommendation: boolean };
    }>({ path: '/api/settings/overview' });
    return {
      notificationEnabled: value.notification.inAppChannelEnabled,
      privateAccount: value.privacy.accountVisibility === 'PRIVATE',
      recommendationEnabled: value.recommendation.allowPersonalizedRecommendation,
      interests: [],
    };
  },
  notification: async () =>
    notificationToView(
      await apiClient.request<BackendNotificationSettings>({ path: '/api/settings/notifications' }),
    ),
  updateNotification: async (body: NotificationSettingsView) =>
    notificationToView(
      await apiClient.request<BackendNotificationSettings, ReturnType<typeof notificationToPatch>>({
        method: 'PATCH',
        path: '/api/settings/notifications',
        body: notificationToPatch(body),
      }),
    ),
  interestCatalog: () =>
    apiClient.request<InterestTagCatalogView>({ path: '/api/settings/interests/catalog' }),
  interests: async () => {
    const value = await apiClient.request<BackendInterestList>({ path: '/api/settings/interests' });
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
