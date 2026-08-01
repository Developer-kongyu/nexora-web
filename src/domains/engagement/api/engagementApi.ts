import { apiClient } from '@/shared/api/client';
export const engagementApi = {
  like: (postId: string) =>
    apiClient.request<void>({ method: 'POST', path: `/api/posts/${postId}/like` }),
  unlike: (postId: string) =>
    apiClient.request<void>({ method: 'DELETE', path: `/api/posts/${postId}/like` }),
  impression: (postId: string) =>
    apiClient.request<void>({ method: 'POST', path: `/api/posts/${postId}/impressions` }),
};
