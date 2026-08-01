import { apiClient } from '@/shared/api/client';
import type { NotificationSettingsView } from '../model/types';

export interface SettingsOverview {
  notificationEnabled: boolean;
  privateAccount: boolean;
  recommendationEnabled: boolean;
  interests: string[];
}

export const settingsApi = {
  overview: () => apiClient.request<SettingsOverview>({ path: '/api/settings/overview' }),
  notification: () =>
    apiClient.request<NotificationSettingsView>({ path: '/api/settings/notifications' }),
  updateNotification: (body: NotificationSettingsView) =>
    apiClient.request<NotificationSettingsView, NotificationSettingsView>({
      method: 'PATCH',
      path: '/api/settings/notifications',
      body,
    }),
  interests: () => apiClient.request<string[]>({ path: '/api/settings/interests' }),
  updateInterests: (interests: string[]) =>
    apiClient.request<string[], { interests: string[] }>({
      method: 'PUT',
      path: '/api/settings/interests',
      body: { interests },
    }),
};
