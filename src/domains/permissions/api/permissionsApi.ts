import { apiClient } from '@/shared/api/client';
import type { PermissionPolicy, PermissionPreview } from '../model/types';

export const permissionsApi = {
  update: (policy: PermissionPolicy) =>
    apiClient.request<PermissionPolicy, PermissionPolicy>({
      method: 'PATCH',
      path: '/api/permissions/me/policy',
      body: policy,
    }),

  preview: (policy: PermissionPolicy) =>
    apiClient.request<PermissionPreview, PermissionPolicy>({
      method: 'POST',
      path: '/api/permissions/me/policy/preview',
      body: policy,
    }),
};
