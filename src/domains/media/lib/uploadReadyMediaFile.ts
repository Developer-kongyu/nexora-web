import { toError } from '@/shared/lib/error';
import { mediaApi } from '../api/mediaApi';
import type {
  ConfirmMediaAssetUploadedInput,
  MediaAssetScene,
  MediaUploadCheckpoint,
  MediaUploadLifecycleStage,
  UploadableMediaKind,
  UploadReadyMediaFileResult,
} from '../model/types';
import { MediaUploadError } from './mediaUploadError';
import { uploadFileWithQiniu } from './qiniuBrowserUpload';

const DEFAULT_PROCESSING_POLL_INTERVAL_MS = 1_200;
const DEFAULT_PROCESSING_POLL_ATTEMPTS = 30;

function checkpointMatchesInput(input: {
  checkpoint: MediaUploadCheckpoint;
  file: File;
  clientUploadId: string;
  scene: MediaAssetScene;
  assetKind: UploadableMediaKind;
}): boolean {
  const expectedContentType = input.file.type || null;
  return (
    input.checkpoint.scene === input.scene &&
    input.checkpoint.assetKind === input.assetKind &&
    input.checkpoint.fileName === input.file.name &&
    input.checkpoint.fileLastModified === input.file.lastModified &&
    input.checkpoint.confirmation.clientUploadId === input.clientUploadId &&
    input.checkpoint.confirmation.contentType === expectedContentType &&
    input.checkpoint.confirmation.sizeInBytes === String(input.file.size)
  );
}

function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(toError(signal.reason, '媒体处理等待已取消。'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      window.clearTimeout(timer);
      reject(toError(signal?.reason, '媒体处理等待已取消。'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function ticketCanStillUpload(checkpoint: MediaUploadCheckpoint): boolean {
  if (checkpoint.objectUploaded) return true;
  const expiresAt = Date.parse(checkpoint.ticket.expiresAtIso);
  return Number.isFinite(expiresAt) && expiresAt - Date.now() > 5_000;
}

function buildConfirmation(input: {
  mediaAssetId: string;
  clientUploadId: string;
  uploadSessionRevision: string;
  file: File;
}): ConfirmMediaAssetUploadedInput {
  return {
    mediaAssetId: input.mediaAssetId,
    uploadSessionRevision: input.uploadSessionRevision,
    clientUploadId: input.clientUploadId,
    clientSha256: null,
    contentType: input.file.type || null,
    sizeInBytes: String(input.file.size),
    originWidth: null,
    originHeight: null,
    durationMs: null,
  };
}

async function requestCheckpoint(input: {
  file: File;
  clientUploadId: string;
  scene: MediaAssetScene;
  assetKind: UploadableMediaKind;
  signal?: AbortSignal;
}): Promise<MediaUploadCheckpoint> {
  const response = await mediaApi.createUploadSessions(
    {
      items: [
        {
          clientUploadId: input.clientUploadId,
          scene: input.scene,
          fileName: input.file.name,
          contentType: input.file.type,
          sizeInBytes: String(input.file.size),
          assetKind: input.assetKind,
        },
      ],
    },
    input.signal,
  );
  if (response.results.length !== 1) {
    throw new MediaUploadError({
      code: 'MEDIA_UPLOAD_SESSION_RESULT_INVALID',
      message: '上传会话响应数量异常，请重试。',
    });
  }
  const result = response.results[0];
  if (
    !result ||
    result.clientUploadId !== input.clientUploadId ||
    result.scene !== input.scene ||
    result.assetKind !== input.assetKind
  ) {
    throw new MediaUploadError({
      code: 'MEDIA_UPLOAD_SESSION_RESULT_INVALID',
      message: '上传会话响应不完整，请重试。',
    });
  }
  if (result.resultType === 'REJECTED') {
    throw new MediaUploadError({
      code: result.errorCode,
      message: result.errorMessage || '无法创建媒体上传会话。',
    });
  }

  return {
    scene: input.scene,
    assetKind: input.assetKind,
    fileName: input.file.name,
    fileLastModified: input.file.lastModified,
    storageKey: result.ticket.objectKey,
    ticket: result.ticket,
    confirmation: buildConfirmation({
      mediaAssetId: result.mediaAssetId,
      clientUploadId: input.clientUploadId,
      uploadSessionRevision: result.ticket.uploadSessionRevision,
      file: input.file,
    }),
    objectUploaded: false,
  };
}

async function waitUntilReady(input: {
  checkpoint: MediaUploadCheckpoint;
  assetKind: UploadableMediaKind;
  signal?: AbortSignal;
  onStage?: (stage: MediaUploadLifecycleStage) => void;
  pollIntervalMs: number;
  pollAttempts: number;
}): Promise<UploadReadyMediaFileResult> {
  let lastStatus: string | null = null;
  let retryRequested = false;
  for (let attempt = 0; attempt < input.pollAttempts; attempt += 1) {
    input.onStage?.(attempt === 0 ? 'CONFIRMING' : 'PROCESSING');
    const result = await mediaApi.confirmUploaded(input.checkpoint.confirmation, input.signal);
    if (
      result.mediaAssetId !== input.checkpoint.confirmation.mediaAssetId ||
      result.assetKind !== input.assetKind
    ) {
      throw new MediaUploadError({
        code: 'MEDIA_UPLOAD_CONFIRM_RESULT_INVALID',
        message: '媒体确认响应与当前文件不一致，请重新选择文件。',
        checkpoint: input.checkpoint,
      });
    }
    lastStatus = result.currentAssetStatus;
    if (result.currentAssetStatus === 'READY') {
      input.onStage?.('READY');
      return {
        mediaAssetId: result.mediaAssetId,
        storageKey: input.checkpoint.storageKey,
        confirmation: input.checkpoint.confirmation,
      };
    }
    if (result.currentAssetStatus === 'FAILED') {
      if (retryRequested) {
        throw new MediaUploadError({
          code: 'MEDIA_ASSET_PROCESSING_FAILED',
          message: '媒体处理重试后仍然失败，请重新选择文件或稍后再试。',
          checkpoint: input.checkpoint,
        });
      }

      input.onStage?.('RETRYING');
      const retryResult = await mediaApi.retryProcessing(
        input.checkpoint.confirmation.mediaAssetId,
        input.signal,
      );
      if (
        retryResult.mediaAssetId !== input.checkpoint.confirmation.mediaAssetId ||
        retryResult.assetKind !== input.assetKind ||
        (input.assetKind === 'IMAGE' &&
          retryResult.requeuedCommand === 'VIDEO_TRANSCODE_REQUESTED') ||
        (input.assetKind === 'VIDEO' &&
          retryResult.requeuedCommand === 'IMAGE_PROCESS_REQUESTED')
      ) {
        throw new MediaUploadError({
          code: 'MEDIA_PROCESSING_RETRY_RESULT_INVALID',
          message: '媒体重试响应与当前文件不一致，请重新选择文件。',
          checkpoint: input.checkpoint,
        });
      }
      retryRequested = true;
      lastStatus = retryResult.currentAssetStatus;
      if (retryResult.currentAssetStatus === 'READY') {
        input.onStage?.('READY');
        return {
          mediaAssetId: retryResult.mediaAssetId,
          storageKey: input.checkpoint.storageKey,
          confirmation: input.checkpoint.confirmation,
        };
      }
      if (retryResult.currentAssetStatus === 'FAILED') {
        throw new MediaUploadError({
          code: 'MEDIA_ASSET_PROCESSING_FAILED',
          message: '媒体处理失败且无法自动恢复，请重新选择文件。',
          checkpoint: input.checkpoint,
        });
      }
    }
    if (attempt + 1 < input.pollAttempts) {
      try {
        await abortableDelay(input.pollIntervalMs, input.signal);
      } catch (error) {
        throw new MediaUploadError({
          code: 'MEDIA_UPLOAD_ABORTED',
          message: '媒体处理等待已取消。',
          checkpoint: input.checkpoint,
          cause: error,
        });
      }
    }
  }

  throw new MediaUploadError({
    code: 'MEDIA_ASSET_PROCESSING_TIMEOUT',
    message: `媒体仍在处理中（${lastStatus ?? 'UNKNOWN'}），可直接再次提交以继续检查。`,
    checkpoint: input.checkpoint,
  });
}

export async function uploadReadyMediaFile(input: {
  file: File;
  clientUploadId: string;
  scene: MediaAssetScene;
  assetKind?: UploadableMediaKind;
  resumeFrom?: MediaUploadCheckpoint | null;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onStage?: (stage: MediaUploadLifecycleStage) => void;
  onCheckpoint?: (checkpoint: MediaUploadCheckpoint) => void;
  processingPollIntervalMs?: number;
  processingPollAttempts?: number;
}): Promise<UploadReadyMediaFileResult> {
  const assetKind = input.assetKind ?? 'IMAGE';
  let checkpoint = input.resumeFrom ?? null;
  if (
    checkpoint &&
    !checkpointMatchesInput({
      checkpoint,
      file: input.file,
      clientUploadId: input.clientUploadId,
      scene: input.scene,
      assetKind,
    })
  ) {
    throw new MediaUploadError({
      code: 'MEDIA_UPLOAD_CHECKPOINT_FILE_MISMATCH',
      message: '上传检查点不属于当前文件，请重新选择文件后再提交。',
    });
  }
  if (!checkpoint || (!checkpoint.objectUploaded && !ticketCanStillUpload(checkpoint))) {
    input.onStage?.('REQUESTING_SESSION');
    checkpoint = await requestCheckpoint({ ...input, assetKind });
    input.onCheckpoint?.(checkpoint);
  }

  if (!checkpoint.objectUploaded) {
    input.onStage?.('UPLOADING');
    try {
      await uploadFileWithQiniu({
        file: input.file,
        ticket: checkpoint.ticket,
        signal: input.signal,
        onProgress: input.onProgress,
      });
    } catch (error) {
      if (error instanceof MediaUploadError) {
        throw new MediaUploadError({
          code: error.code,
          message: error.message,
          checkpoint,
          cause: error.cause,
        });
      }
      throw error;
    }
    checkpoint = { ...checkpoint, objectUploaded: true };
    input.onCheckpoint?.(checkpoint);
  }

  return waitUntilReady({
    checkpoint,
    assetKind,
    signal: input.signal,
    onStage: input.onStage,
    pollIntervalMs: input.processingPollIntervalMs ?? DEFAULT_PROCESSING_POLL_INTERVAL_MS,
    pollAttempts: input.processingPollAttempts ?? DEFAULT_PROCESSING_POLL_ATTEMPTS,
  });
}
