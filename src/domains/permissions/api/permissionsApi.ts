import { apiClient } from '@/shared/api/client';
import type { PermissionPolicy, PermissionPreview } from '../model/types';

export const permissionsApi = {
  get: () =>
    apiClient.request<PermissionPolicy>({
      path: '/api/permissions/me/policy',
    }),

  update: async (policy: PermissionPolicy) => {
    const result = await apiClient.request<{ snapshot: PermissionPolicy }, PermissionPolicy>({
      method: 'PATCH',
      path: '/api/permissions/me/policy',
      body: policy,
    });
    return result.snapshot;
  },

  preview: async (policy: PermissionPolicy): Promise<PermissionPreview> => {
    const result = await apiClient.request<{ previewPolicy: PermissionPolicy }, PermissionPolicy>({
      method: 'POST',
      path: '/api/permissions/me/policy/preview',
      body: policy,
    });
    return result.previewPolicy;
  },
};
