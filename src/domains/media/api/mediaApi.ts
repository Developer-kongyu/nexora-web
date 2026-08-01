import { apiClient } from '@/shared/api/client';
import type {
  ConfirmMediaAssetUploadedInput,
  ConfirmMediaAssetUploadedResult,
  CreateMediaUploadSessionsInput,
  CreateMediaUploadSessionsResult,
  RetryMediaAssetProcessingResult,
} from '../model/types';

export const mediaApi = {
  createUploadSessions: (input: CreateMediaUploadSessionsInput, signal?: AbortSignal) =>
    apiClient.request<CreateMediaUploadSessionsResult, CreateMediaUploadSessionsInput>({
      method: 'POST',
      path: '/api/media/upload-sessions',
      body: input,
      signal,
    }),

  confirmUploaded: (input: ConfirmMediaAssetUploadedInput, signal?: AbortSignal) =>
    apiClient.request<ConfirmMediaAssetUploadedResult, ConfirmMediaAssetUploadedInput>({
      method: 'POST',
      path: '/api/media/assets/confirm-uploaded',
      body: input,
      signal,
    }),

  retryProcessing: (mediaAssetId: string, signal?: AbortSignal) =>
    apiClient.request<RetryMediaAssetProcessingResult>({
      method: 'POST',
      path: `/api/media/assets/${encodeURIComponent(mediaAssetId)}/retry`,
      signal,
    }),
};
