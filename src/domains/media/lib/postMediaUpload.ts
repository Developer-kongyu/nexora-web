import { isMediaUploadError } from './mediaUploadError';
import { uploadReadyMediaFile } from './uploadReadyMediaFile';
import type { MediaUploadLifecycleStage, UploadItem } from '../model/types';
import { getErrorMessage } from '@/shared/lib/error';

function mapLifecycleStage(stage: MediaUploadLifecycleStage): UploadItem['status'] {
  switch (stage) {
    case 'REQUESTING_SESSION':
      return 'creating-session';
    case 'UPLOADING':
      return 'uploading';
    case 'CONFIRMING':
      return 'confirming';
    case 'RETRYING':
    case 'PROCESSING':
      return 'processing';
    case 'READY':
      return 'ready';
  }
}

export async function uploadPostMediaQueueItem(input: {
  item: UploadItem;
  signal?: AbortSignal;
  update: (id: string, patch: Partial<UploadItem>) => void;
}): Promise<string> {
  if (input.item.status === 'ready' && input.item.mediaAssetId) {
    return input.item.mediaAssetId;
  }

  try {
    const result = await uploadReadyMediaFile({
      file: input.item.file,
      clientUploadId: input.item.clientUploadId,
      scene: 'POST_COMPOSE',
      assetKind: input.item.assetKind,
      resumeFrom: input.item.checkpoint,
      signal: input.signal,
      onProgress: (progress) => input.update(input.item.clientUploadId, { progress }),
      onStage: (stage) =>
        input.update(input.item.clientUploadId, {
          status: mapLifecycleStage(stage),
          error: undefined,
        }),
      onCheckpoint: (checkpoint) =>
        input.update(input.item.clientUploadId, { checkpoint }),
    });

    input.update(input.item.clientUploadId, {
      status: 'ready',
      progress: 100,
      mediaAssetId: result.mediaAssetId,
      error: undefined,
    });
    return result.mediaAssetId;
  } catch (error) {
    const mediaError = isMediaUploadError(error) ? error : null;
    input.update(input.item.clientUploadId, {
      status: 'failed',
      checkpoint:
        mediaError?.code === 'MEDIA_UPLOAD_CHECKPOINT_FILE_MISMATCH'
          ? undefined
          : (mediaError?.checkpoint ?? input.item.checkpoint),
      error: getErrorMessage(error, '媒体上传失败，请重试。'),
    });
    throw error;
  }
}
