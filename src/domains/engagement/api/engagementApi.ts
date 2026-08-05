import { apiClient } from '@/shared/api/client';

export type ImpressionScene = 'FEED' | 'DETAIL' | 'SEARCH' | 'PROFILE' | 'COMMUNITY';

export type ImpressionRecordResult =
  | {
      status: 'ACCEPTED';
      eventId: string;
      targetPostId: string;
      metricOwnerPostId: string;
    }
  | {
      status: 'IGNORED';
      ignoredReason:
        | 'IDENTITY_MISSING'
        | 'TARGET_UNAVAILABLE'
        | 'EVENT_DUPLICATED'
        | 'CLIENT_OCCURRED_AT_OUT_OF_WINDOW';
      eventId: string | null;
      targetPostId: string | null;
      metricOwnerPostId: string | null;
    }
  | {
      status: 'REJECTED';
      rejectedReason: string;
      eventId: null;
      targetPostId: string | null;
      metricOwnerPostId: string | null;
    };

const IMPRESSION_DEVICE_ID_KEY = 'nexora:impression-device-id';
let fallbackDeviceId: string | null = null;

function createDeviceId(): string {
  return `web-${crypto.randomUUID()}`;
}

function getOrCreateDeviceId(): string {
  if (fallbackDeviceId) return fallbackDeviceId;
  try {
    const stored = window.localStorage.getItem(IMPRESSION_DEVICE_ID_KEY)?.trim();
    if (stored) {
      fallbackDeviceId = stored;
      return stored;
    }
    const created = createDeviceId();
    window.localStorage.setItem(IMPRESSION_DEVICE_ID_KEY, created);
    fallbackDeviceId = created;
    return created;
  } catch {
    fallbackDeviceId = createDeviceId();
    return fallbackDeviceId;
  }
}

export const engagementApi = {
  like: (postId: string) =>
    apiClient.request<void>({ method: 'POST', path: `/api/posts/${postId}/like` }),
  unlike: (postId: string) =>
    apiClient.request<void>({ method: 'DELETE', path: `/api/posts/${postId}/like` }),
  impression: (postId: string, scene: ImpressionScene) =>
    apiClient.request<
      ImpressionRecordResult,
      {
        deviceId: string;
        anonymousSessionKey: null;
        scene: ImpressionScene;
        clientEventId: string;
        clientOccurredAtIso: string;
      }
    >({
      method: 'POST',
      path: `/api/posts/${postId}/impressions`,
      body: {
        deviceId: getOrCreateDeviceId(),
        anonymousSessionKey: null,
        scene,
        clientEventId: crypto.randomUUID(),
        clientOccurredAtIso: new Date().toISOString(),
      },
    }),
};
