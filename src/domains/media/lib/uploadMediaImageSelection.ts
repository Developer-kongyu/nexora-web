import { isMediaUploadError } from './mediaUploadError';
import { uploadReadyMediaFile } from './uploadReadyMediaFile';
import { getErrorMessage } from '@/shared/lib/error';
import type {
  MediaAssetScene,
  MediaImageSelection,
  MediaImageSelectionController,
} from '../model/types';

export interface UploadMediaImageSelectionInput {
  selection: MediaImageSelection | null;
  scene: MediaAssetScene;
  controller: Pick<MediaImageSelectionController, 'update'>;
  signal: AbortSignal;
  fallbackErrorMessage?: string;
}

export async function uploadMediaImageSelection({
  selection,
  scene,
  controller,
  signal,
  fallbackErrorMessage = '图片上传失败，请检查网络后重试。',
}: UploadMediaImageSelectionInput): Promise<string | undefined> {
  if (!selection) return undefined;
  if (selection.stage === 'READY' && selection.storageKey) return selection.storageKey;

  try {
    const result = await uploadReadyMediaFile({
      file: selection.file,
      clientUploadId: selection.clientUploadId,
      scene,
      resumeFrom: selection.checkpoint,
      signal,
      onProgress: (progress) => controller.update(selection.clientUploadId, { progress }),
      onStage: (stage) =>
        controller.update(selection.clientUploadId, { stage, errorMessage: null }),
      onCheckpoint: (checkpoint) =>
        controller.update(selection.clientUploadId, { checkpoint }),
    });

    controller.update(selection.clientUploadId, {
      stage: 'READY',
      progress: 100,
      storageKey: result.storageKey,
      errorMessage: null,
    });
    return result.storageKey;
  } catch (error) {
    const mediaError = isMediaUploadError(error) ? error : null;
    const checkpoint =
      mediaError?.code === 'MEDIA_UPLOAD_CHECKPOINT_FILE_MISMATCH'
        ? null
        : (mediaError?.checkpoint ?? selection.checkpoint);

    controller.update(selection.clientUploadId, {
      stage: 'ERROR',
      checkpoint,
      errorMessage: getErrorMessage(error, fallbackErrorMessage),
    });
    throw error;
  }
}
