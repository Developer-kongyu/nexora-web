import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ConfirmMediaAssetUploadedResult,
  MediaUploadCheckpoint,
  RetryMediaAssetProcessingResult,
} from '../model/types';

const mocks = vi.hoisted(() => ({
  createUploadSessions: vi.fn(),
  confirmUploaded: vi.fn(),
  retryProcessing: vi.fn(),
  uploadFileWithQiniu: vi.fn(),
}));

vi.mock('../api/mediaApi', () => ({
  mediaApi: {
    createUploadSessions: mocks.createUploadSessions,
    confirmUploaded: mocks.confirmUploaded,
    retryProcessing: mocks.retryProcessing,
  },
}));

vi.mock('./qiniuBrowserUpload', () => ({
  uploadFileWithQiniu: mocks.uploadFileWithQiniu,
}));

import { uploadReadyMediaFile } from './uploadReadyMediaFile';

function imageFile(name = 'avatar.png', lastModified = 1_700_000_000_000) {
  return new File(['image-bytes'], name, { type: 'image/png', lastModified });
}

function videoFile(name = 'clip.mp4', lastModified = 1_700_000_000_000) {
  return new File(['video-bytes'], name, { type: 'video/mp4', lastModified });
}

function checkpoint(file: File): MediaUploadCheckpoint {
  return {
    scene: 'USER_AVATAR',
    assetKind: 'IMAGE',
    fileName: file.name,
    fileLastModified: file.lastModified,
    storageKey: 'mock/user-avatar/object-key',
    ticket: {
      token: 'ticket',
      objectKey: 'mock/user-avatar/object-key',
      bucket: 'media',
      uploadSessionRevision: '7',
      region: 'z0',
      expiresInSeconds: 900,
      expiresAtIso: '2099-01-01T00:00:00.000Z',
      sdkScriptUrl: '/mock-qiniu-sdk.js',
      recommendedClientConfig: {
        useCdnDomain: true,
        checkByMD5: false,
        forceDirect: false,
        chunkSizeMB: 4,
      },
    },
    confirmation: {
      mediaAssetId: 'asset-1',
      uploadSessionRevision: '7',
      clientUploadId: 'client-1',
      clientSha256: null,
      contentType: 'image/png',
      sizeInBytes: String(file.size),
      originWidth: null,
      originHeight: null,
      durationMs: null,
    },
    objectUploaded: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.uploadFileWithQiniu.mockResolvedValue(undefined);
});

describe('uploadReadyMediaFile', () => {
  it('automatically retries a failed image pipeline once and resumes readiness polling', async () => {
    const file = imageFile();
    const savedCheckpoint = checkpoint(file);
    const failed: ConfirmMediaAssetUploadedResult = {
      mediaAssetId: 'asset-1',
      assetKind: 'IMAGE',
      currentAssetStatus: 'FAILED',
      idempotent: true,
      processingAction: 'NONE',
    };
    const ready: ConfirmMediaAssetUploadedResult = {
      ...failed,
      currentAssetStatus: 'READY',
    };
    const retry: RetryMediaAssetProcessingResult = {
      mediaAssetId: 'asset-1',
      assetKind: 'IMAGE',
      currentAssetStatus: 'UPLOADED',
      idempotent: false,
      requeuedCommand: 'IMAGE_PROCESS_REQUESTED',
    };
    mocks.confirmUploaded.mockResolvedValueOnce(failed).mockResolvedValueOnce(ready);
    mocks.retryProcessing.mockResolvedValueOnce(retry);
    const stages: string[] = [];

    const result = await uploadReadyMediaFile({
      file,
      clientUploadId: 'client-1',
      scene: 'USER_AVATAR',
      resumeFrom: savedCheckpoint,
      processingPollIntervalMs: 0,
      processingPollAttempts: 3,
      onStage: (stage) => stages.push(stage),
    });

    expect(mocks.retryProcessing).toHaveBeenCalledTimes(1);
    expect(mocks.retryProcessing).toHaveBeenCalledWith('asset-1', undefined);
    expect(mocks.confirmUploaded).toHaveBeenCalledTimes(2);
    expect(stages).toContain('RETRYING');
    expect(result).toEqual({
      mediaAssetId: 'asset-1',
      storageKey: 'mock/user-avatar/object-key',
      confirmation: savedCheckpoint.confirmation,
    });
  });

  it('rejects a checkpoint that belongs to a different local file', async () => {
    const currentFile = imageFile('new-avatar.png', 1_800_000_000_000);
    const staleFile = imageFile('old-avatar.png', 1_700_000_000_000);

    await expect(
      uploadReadyMediaFile({
        file: currentFile,
        clientUploadId: 'client-1',
        scene: 'USER_AVATAR',
        resumeFrom: checkpoint(staleFile),
      }),
    ).rejects.toMatchObject({
      code: 'MEDIA_UPLOAD_CHECKPOINT_FILE_MISMATCH',
    });

    expect(mocks.createUploadSessions).not.toHaveBeenCalled();
    expect(mocks.confirmUploaded).not.toHaveBeenCalled();
  });

  it('builds a file-bound checkpoint from the single canonical upload-session result', async () => {
    const file = imageFile();
    mocks.createUploadSessions.mockResolvedValueOnce({
      results: [
        {
          clientUploadId: 'client-1',
          scene: 'USER_AVATAR',
          assetKind: 'IMAGE',
          resultType: 'CREATED',
          mediaAssetId: 'asset-1',
          currentAssetStatus: 'UPLOADING',
          ticket: {
            token: 'ticket',
            objectKey: 'mock/user-avatar/object-key',
            bucket: 'media',
            uploadSessionRevision: '7',
            region: 'z0',
            expiresInSeconds: 900,
            expiresAtIso: '2099-01-01T00:00:00.000Z',
            sdkScriptUrl: '/mock-qiniu-sdk.js',
            recommendedClientConfig: {
              useCdnDomain: true,
              checkByMD5: false,
              forceDirect: false,
              chunkSizeMB: 4,
            },
          },
          errorCode: null,
          errorMessage: null,
        },
      ],
    });
    mocks.confirmUploaded.mockResolvedValueOnce({
      mediaAssetId: 'asset-1',
      assetKind: 'IMAGE',
      currentAssetStatus: 'READY',
      idempotent: false,
      processingAction: 'IMAGE_PROCESS_ENQUEUED',
    });
    const checkpoints: MediaUploadCheckpoint[] = [];

    await uploadReadyMediaFile({
      file,
      clientUploadId: 'client-1',
      scene: 'USER_AVATAR',
      onCheckpoint: (value) => checkpoints.push(value),
    });

    expect(mocks.createUploadSessions).toHaveBeenCalledWith(
      {
        items: [
          {
            clientUploadId: 'client-1',
            scene: 'USER_AVATAR',
            fileName: 'avatar.png',
            contentType: 'image/png',
            sizeInBytes: String(file.size),
            assetKind: 'IMAGE',
          },
        ],
      },
      undefined,
    );
    expect(checkpoints[0]).toMatchObject({
      scene: 'USER_AVATAR',
      fileName: 'avatar.png',
      fileLastModified: file.lastModified,
      storageKey: 'mock/user-avatar/object-key',
      objectUploaded: false,
    });
    expect(checkpoints.at(-1)).toMatchObject({ objectUploaded: true });
  });

  it('preserves the video asset kind through session creation and confirmation', async () => {
    const file = videoFile();
    mocks.createUploadSessions.mockResolvedValueOnce({
      results: [
        {
          clientUploadId: 'client-video',
          scene: 'POST_COMPOSE',
          assetKind: 'VIDEO',
          resultType: 'CREATED',
          mediaAssetId: 'asset-video',
          currentAssetStatus: 'UPLOADING',
          ticket: {
            token: 'ticket',
            objectKey: 'mock/post-compose/video-key',
            bucket: 'media',
            uploadSessionRevision: '1',
            region: 'z0',
            expiresInSeconds: 900,
            expiresAtIso: '2099-01-01T00:00:00.000Z',
            sdkScriptUrl: '/mock-qiniu-sdk.js',
            recommendedClientConfig: {
              useCdnDomain: true,
              checkByMD5: false,
              forceDirect: false,
              chunkSizeMB: 4,
            },
          },
          errorCode: null,
          errorMessage: null,
        },
      ],
    });
    mocks.confirmUploaded.mockResolvedValueOnce({
      mediaAssetId: 'asset-video',
      assetKind: 'VIDEO',
      currentAssetStatus: 'READY',
      idempotent: false,
      processingAction: 'VIDEO_TRANSCODE_ENQUEUED',
    });

    const result = await uploadReadyMediaFile({
      file,
      clientUploadId: 'client-video',
      scene: 'POST_COMPOSE',
      assetKind: 'VIDEO',
    });

    expect(mocks.createUploadSessions).toHaveBeenCalledWith(
      {
        items: [
          {
            clientUploadId: 'client-video',
            scene: 'POST_COMPOSE',
            fileName: 'clip.mp4',
            contentType: 'video/mp4',
            sizeInBytes: String(file.size),
            assetKind: 'VIDEO',
          },
        ],
      },
      undefined,
    );
    expect(mocks.confirmUploaded).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaAssetId: 'asset-video',
        contentType: 'video/mp4',
      }),
      undefined,
    );
    expect(result.mediaAssetId).toBe('asset-video');
  });
});
